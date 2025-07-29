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

type parametersType = {[key: string]: any};

function getParameters(jsonSchema: OpenAPIV3_1.SchemaObject): parametersType {
    const params: parametersType = {}

    for (const propName in jsonSchema.properties) {
        const jsonSchemaProp = jsonSchema.properties[propName];
        const code = jsonSchemaToZod(jsonSchemaProp);
        params[propName] = evalTS(code);
    }

    return params;
}

function getToolDefinition(path: any, openapi: any) {
        if (path.post == undefined || path.post.requestBody == undefined) {           
            debug("no valid post information");
            return null;
        }

        const operation = path.post.requestBody.content["application/json"];
        const inputSchema = operation.schema;
        debug("operation", operation);
        debug("inputSchema", inputSchema);

        const schemas = openapi.components == undefined ? null: openapi.components.schemas;
        const operationJsonInputSchema = expandJSONSchemaDefinition(inputSchema, schemas)
        debug("operationJsonSchema after expand", JSON.stringify(operationJsonInputSchema, null, " "));

        const serviceName = openapi.info["x-ibm-ads-decision-service-name"];
        debug("decisionServiceName", serviceName);

        const inputParameters: parametersType = getParameters(operationJsonInputSchema);

    return {
        title: path.post.summary,
        description: path.post.description,
        inputSchema: inputParameters
    };
}

function registerTool(server: McpServer, apikey: string, baseURL: string, decisionOpenAPI: any, decisionServiceId: string, toolNames: string[]) {
    for (const key in decisionOpenAPI.paths) {
        const value = decisionOpenAPI.paths[key];

        const toolDef = getToolDefinition(value, decisionOpenAPI);

        if (toolDef == null) {
            debug("Skipping invalid operation", key);
            continue ;
        }

        const operationId = value.post.operationId;

        if (operationId == undefined) {
            debug("no operationId for ", JSON.stringify(value))
            continue ;
        }

        const serviceName = decisionOpenAPI.info["x-ibm-ads-decision-service-name"];
        debug("decisionServiceName", serviceName);

        const toolName = getToolName(operationId, serviceName, decisionServiceId, toolNames);
        debug("toolName", toolName, toolNames);
        toolNames.push(toolName);

        server.registerTool(
            toolName, toolDef,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async (input, n) => {
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

export async function createMcpServer(name: string, configuration: any): Promise<McpServer> {
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

    if (configuration.isHttpTransport) {
        debug("IBM Decision Intelligence MCP Server version", version, "running on http");
        runHTTPServer(server);
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
    }
    return server;
}