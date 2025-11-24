import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    executeLastDeployedDecisionService,    
    getDecisionMetadata,
    getDecisionServiceIds,
    getDecisionServiceOperations,
    getDecisionServices,
    getDecisionServiceOpenAPI,
    getDeploymentSpaceMetadata,
    getDecisionServiceOperationSchema,
    getDecisionRuntimeOpenAPI,
    setDecisionMetadata
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
import http from "node:http";
import {z} from 'zod/v3';

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

async function registerTool(server: McpServer, configuration: Configuration, deploymentSpace: string, decisionOpenAPI: OpenAPIV3_1.Document, decisionServiceId: string, toolNames: string[]) {
    for (const key in decisionOpenAPI.paths) {
        debug("Found operationName", key);

        const value = decisionOpenAPI.paths[key];

        if (value == undefined || value.post == undefined) {           
            debug("Invalid openapi for path", key)
            continue ;
        }

        const operationId = value.post.operationId;

        if (operationId == undefined) {
            debug("No operationId for ", JSON.stringify(value))
            continue ;
        }
        
        const toolDef = getToolDefinition(value, decisionOpenAPI.components);

        if (toolDef == null) {
            debug("No tooldef for ", key);
            continue ;
        }

        const body = value.post.requestBody;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const operation = (body as any).content["application/json"];
        const inputSchema = operation.schema;
        debug("operation", operation);
        debug("inputSchema", inputSchema);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolName = await getToolName(configuration, deploymentSpace, (decisionOpenAPI as any).info, operationId, decisionServiceId, toolNames);
        debug("toolName", toolName, toolNames);
        toolNames.push(toolName);

        server.registerTool(
            toolName,
            toolDef,
            async (input) => {
                const decInput = input;
                debug("Execute decision with", JSON.stringify(decInput, null, " "))
                const str = await executeLastDeployedDecisionService(configuration, deploymentSpace, decisionServiceId, operationId, decInput);
                return {
                    content: [{ type: "text", text: str}]
                };
            }
        );
    }
}

export async function createMcpServer(name: string, configuration: Configuration): Promise<{ server: McpServer, transport?: StdioServerTransport, httpServer?: http.Server }> {
    const version = configuration.version;
    const server = new McpServer({
        name: name,
        version: version
    });
 
    await server.registerTool(
        'getDecisionRuntimeOpenAPI',
        {
            title: 'get the openapi of the decision runtime', 
            description: 'get the openapi of the decision runtime',
            inputSchema: {}
        },
        async () => {
            const output = await getDecisionRuntimeOpenAPI(configuration);
            return {
                content: [{ type: 'text', text: JSON.stringify(output) }],
            };
        }
    );

    await server.registerTool(
        'getDecisionServices',
        {
            title: 'list all decision services in a deployment space', 
            description: 'list all decision services in a deployment space',
            inputSchema: {
                deploymentSpace: z.string().describe("deployment space. The only deployment space for DI is development")
            }
        },
        async ({ deploymentSpace }) => {
            debug(deploymentSpace);
            const output: object[] = await getDecisionServices(configuration, deploymentSpace);
            return {
                content: [{ type: 'text', text: JSON.stringify(output) }],
            };
        }
    );

    await server.registerTool(
        'getDecisionServiceOperations',
        {
            title: 'list all operations of a decision service of a deployment space', 
            description: 'list all operations of a decision service of a deployment space',
            inputSchema: {
                decisionServiceId: z.string().describe("the decision service id"),
                deploymentSpace: z.string().describe("deployment space")
            }
        },
        async ({ deploymentSpace, decisionServiceId }) => {
            debug(deploymentSpace);
            const output: object[] = await getDecisionServiceOperations(configuration, deploymentSpace, decisionServiceId);
            return {
                content: [{ type: 'text', text: JSON.stringify(output) }],
            };
        }
    );

   await server.registerTool(
        'getDecisionMetadata',
        {
            title: 'Get all metadata of a decision in a deployment space', 
            description: 'Get all metadata of a decision in a deployment space',
            inputSchema: {
                decisionId: z.string().describe("the decision id"),
                deploymentSpace: z.string().describe("the deployment space")
            }
        },
        async ({ deploymentSpace, decisionId }) => {
            debug(deploymentSpace);
            const output: object[] = await getDecisionMetadata(configuration, deploymentSpace, decisionId);
            return {
                content: [{ type: 'text', text: JSON.stringify(output) }],
            };
        }
    );

    await server.registerTool(
        'ActivateOrDesactivateBusinessMonitoring',
        {
            title: 'Activate or desactivate the business monitoring.', 
            description: 'Activate the business monitoring. Default is true. Status is stored in the metadata businessMonitoringEnabled',
            inputSchema: {
                decisionId: z.string().describe("the decision id"),
                deploymentSpace: z.string().describe("the deployment space"),
                enable: z.boolean().describe("whether the business monitoring must be activated. True to activate the businessMonitoring, false to desactivate.")
            }
        },
        async ({ deploymentSpace, decisionId, enable }) => {
            debug(deploymentSpace);
            let metadata = await getDecisionMetadata(configuration, deploymentSpace, decisionId);
            metadata.businessMonitoringEnabled = {
                "name": "businessMonitoringEnabled",
                "kind": "PLAIN",
                "readOnly": false,
                "value": "" + enable
            };
            setDecisionMetadata(configuration, deploymentSpace, decisionId, metadata);
            return {
                content: [{ type: 'text', text: JSON.stringify("done") }],
            };
        }
    );

    await server.registerTool(
        'getDecisionServiceOperationSchema',
        {
            title: 'get the schema of the operation of a decision service of a deployment space', 
            description: 'get the schema of the operation of a decision service of a deployment space',
            inputSchema: {
                deploymentSpace: z.string().describe("deployment space"),
                decisionServiceId: z.string().describe("the decision service id"),
                operationId: z.string().describe("the operationId")
            }
        },
        async ({ deploymentSpace, decisionServiceId, operationId }) => {
            debug(deploymentSpace);
            const output: object[] = await getDecisionServiceOperationSchema(configuration, deploymentSpace, decisionServiceId, operationId);
            return {
                content: [{ type: 'text', text: JSON.stringify(output) }],
            };
        }
    );

    await server.registerTool(
        'updateDecisionMetadata',
        {
            title: 'change the value of a metadata of a decision in a deployment space', 
            description: 'change the value of a metadata of a decision in a deployment space',
            inputSchema: {
                deploymentSpace: z.string().describe("deployment space"),
                decisionId: z.string().describe("the decision id"),
                metadataKey: z.string().describe("the key of the metadata"),
                metadataValue: z.string().describe("the new value of the metadata")
            }
        },
        async ({ deploymentSpace, decisionId, metadataKey, metadataValue }) => {
            debug(deploymentSpace);
            const metadata = await getDecisionMetadata(configuration, deploymentSpace, decisionId);

            metadata[metadataKey] = {value: metadataValue, name: metadataKey, kind: "PLAIN", readOnly: false};

            await setDecisionMetadata(configuration, deploymentSpace, decisionId, metadata);
            return {
                content: [{ type: 'text', text: JSON.stringify("done") }],
            };
        }
    );

    await server.registerTool(
        'executeDecisionServiceOperation',
        {
            title: 'execute the operation of a decision service of a deployment space', 
            description: 'execute the operation of a decision service of a deployment space',
            inputSchema: {
                deploymentSpace: z.string().describe("deployment space"),
                decisionServiceId: z.string().describe("the decision service id"),
                operationId: z.string().describe("the operationId"),
                input: z.any().describe("the input of the operation")
            }
        },
        async ({ deploymentSpace, decisionServiceId, operationId, input }) => {
            debug(deploymentSpace);
            const output: string = await executeLastDeployedDecisionService(configuration, deploymentSpace, decisionServiceId, operationId, input);
            return {
                content: [{ type: 'text', text: output }]
            };
        }
    );

    if (configuration.decisionServiceToolsEnabled) {
        const toolNames: string[] = [];
        for (const deploymentSpace of configuration.deploymentSpaces) {
            debug("deploymentSpace", deploymentSpace);
            
            let serviceIds = configuration.decisionServiceIds;
            debug("decisionServiceIds", JSON.stringify(configuration.decisionServiceIds));

            if (serviceIds === undefined || serviceIds.length === 0) {
                const spaceMetadata = await getDeploymentSpaceMetadata(configuration, deploymentSpace);
                debug("spaceMetadata", JSON.stringify(spaceMetadata, null, " "));
                
                serviceIds = getDecisionServiceIds(spaceMetadata);
            }
            debug("serviceIds", JSON.stringify(serviceIds, null, " "));

            for (const serviceId of serviceIds) {
                debug("serviceId", serviceId);
                const openapi = await getDecisionServiceOpenAPI(configuration, deploymentSpace, serviceId);
                await registerTool(server, configuration, deploymentSpace, openapi, serviceId, toolNames);
            }
        }
    }

    if (configuration.isHttpTransport()) {
        debug("IBM Decision Intelligence MCP Server version", version, "running on http");
        const httpServer = runHTTPServer(server);
        return { server, httpServer }
    }

    const transport = configuration.transport!;
    await server.connect(transport);
    debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
    return { server, transport }
}