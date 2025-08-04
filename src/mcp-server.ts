import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    executeLastDeployedDecisionService,
    getDecisionServiceIds,
    getDecisionServiceOpenAPI,
    getMetadata
} from './diruntimeclient.js';
import {runHTTPServer} from "./httpserver.js";
import {debug} from "./debug.js";
import {expandJSONSchemaDefinition} from './jsonschema.js';
import {getToolName} from "./ditool.js";
import {jsonSchemaToZod} from "json-schema-to-zod";
import {evalTS} from "./ts.js";
import { OpenAPIV3_1 } from "openapi-types";
import { ZodRawShape } from "zod";
import { Configuration } from "./command-line.js";

function getParameters(jsonSchema: OpenAPIV3_1.SchemaObject): ZodRawShape {
    const params: ZodRawShape = {}

    for (const propName in jsonSchema.properties) {
        const jsonSchemaProp = jsonSchema.properties[propName];
        const code = jsonSchemaToZod(jsonSchemaProp);
        params[propName] = evalTS(code);
    }

    return params;
}

function getToolDefinition(path: OpenAPIV3_1.PathItemObject, components: OpenAPIV3_1.ComponentsObject|null|undefined) {
    if (path.post == undefined || path.post.requestBody == undefined) {
        debug("invalid path", JSON.stringify(path));
        return null;
    }

    const body = path.post.requestBody;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operation = (body as any).content["application/json"];
    const inputSchema = operation.schema;
    debug("operation", operation);
    debug("inputSchema", inputSchema);

    const schemas = components == undefined ? null: components.schemas;
    const operationJsonInputSchema = expandJSONSchemaDefinition(inputSchema, schemas);
    debug("operationJsonSchema after expand", JSON.stringify(operationJsonInputSchema, null, " "));

    return {
        title: path.post.summary,
        description: path.post.description,
        inputSchema: getParameters(operationJsonInputSchema)
    };
}

function registerTool(server: McpServer, apikey: string, baseURL: string, decisionOpenAPI: OpenAPIV3_1.Document, decisionServiceId: string, toolNames: string[]) {
    for (const key in decisionOpenAPI.paths) {
        debug("Found operationName", key);

        const value = decisionOpenAPI.paths[key];

        if (value == undefined || value.post == undefined) {           
            debug("invalid openapi for path", key)
            continue ;
        }

        const operationId = value.post.operationId;

        if (operationId == undefined) {
            debug("no operationId for ", JSON.stringify(value))
            continue ;
        }
        
        const toolDef = getToolDefinition(value, decisionOpenAPI.components);

        if (toolDef == null) {
            debug("no tooldef for ", key);
            continue ;
        }

        const body = value.post.requestBody;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const operation = (body as any).content["application/json"];
        const inputSchema = operation.schema;
        debug("operation", operation);
        debug("inputSchema", inputSchema);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serviceName = (decisionOpenAPI as any).info["x-ibm-ads-decision-service-name"];
        debug("decisionServiceName", serviceName);

        const toolName = getToolName(operationId, serviceName, decisionServiceId, toolNames);
        debug("toolName", toolName, toolNames);
        toolNames.push(toolName);

        server.registerTool(
            toolName,
            toolDef,
            async (input) => {
                const decInput = input;
                debug("Execute decision with", JSON.stringify(decInput, null, " "))
                const str = await executeLastDeployedDecisionService(apikey, baseURL, decisionServiceId, operationId, decInput);
                return {
                    content: [{ type: "text", text: str}]
                };
            }
        );
    }
}

export async function createMcpServer(name: string, configuration: Configuration): Promise<{ server: McpServer, transport?: StdioServerTransport }> {
    const version = configuration.version;
    const server = new McpServer({
        name: name,
        version: version
    });

    const apikey = configuration.apiKey;
    const baseURL = configuration.url;
    const spaceMetadata = await getMetadata(apikey, baseURL, "development");
    debug("spaceMetadata", JSON.stringify(spaceMetadata, null, " "));
    const serviceIds = getDecisionServiceIds(spaceMetadata);
    debug("serviceIds", JSON.stringify(serviceIds, null, " "));

    const toolNames: string[] = [];
    for (const serviceId of serviceIds) {
        debug("serviceId", serviceId);
        const openapi = await getDecisionServiceOpenAPI(apikey, baseURL, serviceId);
        
        registerTool(server, apikey, baseURL, openapi, serviceId, toolNames);
    }

    if (configuration.isHttpTransport()) {
        debug("IBM Decision Intelligence MCP Server version", version, "running on http");
        runHTTPServer(server);
        return { server }
    }

    const transport = configuration.transport!;
    await server.connect(transport);
    debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
    return { server, transport }
}