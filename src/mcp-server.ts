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
import http from "node:http";

// Interface to track tool definitions for change detection
interface ToolDefinition {
    name: string;
    title?: string;
    description?: string;
    inputSchemaHash: string; // Hash of the input schema for comparison
    deploymentSpace: string;
    decisionServiceId: string;
    operationId: string;
}

// Helper function to create a hash of the input schema for comparison
function hashInputSchema(inputSchema: OpenAPIV3_1.SchemaObject): string {
    return JSON.stringify(inputSchema);
}

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

// Helper function to process OpenAPI paths and extract tool definitions
async function processOpenAPIPaths(
    configuration: Configuration,
    deploymentSpace: string,
    openapi: OpenAPIV3_1.Document,
    serviceId: string,
    toolNames: string[]
): Promise<ToolDefinition[]> {
    const toolDefinitions: ToolDefinition[] = [];

    for (const key in openapi.paths) {
        const value = openapi.paths[key];

        if (value == undefined || value.post == undefined) {
            debug("Invalid openapi for path", key);
            continue;
        }

        const operationId = value.post.operationId;

        if (operationId == undefined) {
            debug("No operationId for ", JSON.stringify(value));
            continue;
        }

        const toolDef = getToolDefinition(value, openapi.components);

        if (toolDef == null) {
            debug("No tooldef for ", key);
            continue;
        }

        const body = value.post.requestBody;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const operation = (body as any).content["application/json"];
        const inputSchema = operation.schema;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolName = await getToolName(configuration, deploymentSpace, (openapi as any).info, operationId, serviceId, toolNames);
        toolNames.push(toolName);

        // Store tool definition for change detection
        const schemas = openapi.components == undefined ? null : openapi.components.schemas;
        const operationJsonInputSchema = expandJSONSchemaDefinition(inputSchema, schemas);

        toolDefinitions.push({
            name: toolName,
            title: toolDef.title,
            description: toolDef.description,
            inputSchemaHash: hashInputSchema(operationJsonInputSchema),
            deploymentSpace,
            decisionServiceId: serviceId,
            operationId
        });
    }

    return toolDefinitions;
}

async function registerTool(
    server: McpServer,
    configuration: Configuration,
    deploymentSpace: string,
    decisionOpenAPI: OpenAPIV3_1.Document,
    decisionServiceId: string,
    toolNames: string[],
    toolDefinitions: ToolDefinition[]
) {
    const newToolDefs = await processOpenAPIPaths(
        configuration,
        deploymentSpace,
        decisionOpenAPI,
        decisionServiceId,
        toolNames
    );

    // Register each tool with the server
    for (const toolDef of newToolDefs) {
        if (!decisionOpenAPI.paths) {
            continue;
        }

        const pathKey = Object.keys(decisionOpenAPI.paths).find(key => {
            const value = decisionOpenAPI.paths![key];
            return value?.post?.operationId === toolDef.operationId;
        });

        if (!pathKey) {
            continue;
        }

        const pathItem = decisionOpenAPI.paths[pathKey];
        const mcpToolDef = getToolDefinition(pathItem!, decisionOpenAPI.components);

        if (mcpToolDef) {
            server.registerTool(
                toolDef.name,
                mcpToolDef,
                async (input) => {
                    const decInput = input;
                    debug("Execute decision with", JSON.stringify(decInput, null, " "));
                    const str = await executeLastDeployedDecisionService(
                        configuration,
                        toolDef.deploymentSpace,
                        toolDef.decisionServiceId,
                        toolDef.operationId,
                        decInput
                    );
                    return {
                        content: [{ type: "text", text: str }]
                    };
                }
            );
        }

        toolDefinitions.push(toolDef);
    }
}

// Function to check for tool changes
async function checkForToolChanges(
    server: McpServer,
    configuration: Configuration,
    currentToolDefinitions: ToolDefinition[]
): Promise<boolean> {
    const newToolDefinitions: ToolDefinition[] = [];
    const toolNames: string[] = [];

    try {
        for (const deploymentSpace of configuration.deploymentSpaces) {
            let serviceIds = configuration.decisionServiceIds;

            if (serviceIds === undefined || serviceIds.length === 0) {
                const spaceMetadata = await getMetadata(configuration, deploymentSpace);
                serviceIds = getDecisionServiceIds(spaceMetadata);
            }

            for (const serviceId of serviceIds) {
                const openapi = await getDecisionServiceOpenAPI(configuration, deploymentSpace, serviceId);
                
                // Extract tool definitions without registering
                const toolDefs = await processOpenAPIPaths(
                    configuration,
                    deploymentSpace,
                    openapi,
                    serviceId,
                    toolNames
                );
                
                newToolDefinitions.push(...toolDefs);
            }
        }

        // Compare tool definitions
        if (newToolDefinitions.length !== currentToolDefinitions.length) {
            debug("Tool count changed:", `${currentToolDefinitions.length} -> ${newToolDefinitions.length}`);
            return true;
        }

        // Check if any tool has changed
        for (const newTool of newToolDefinitions) {
            const existingTool = currentToolDefinitions.find(t => t.name === newTool.name);
            if (!existingTool) {
                debug("New tool detected:", newTool.name);
                return true;
            }
            if (existingTool.inputSchemaHash !== newTool.inputSchemaHash) {
                debug("Tool schema changed:", newTool.name);
                return true;
            }
        }

        // Check if any tool was removed
        for (const existingTool of currentToolDefinitions) {
            const newTool = newToolDefinitions.find(t => t.name === existingTool.name);
            if (!newTool) {
                debug("Tool removed:", existingTool.name);
                return true;
            }
        }

        return false;
    } catch (error) {
        debug("Error checking for tool changes:", String(error));
        return false;
    }
}

export async function createMcpServer(name: string, configuration: Configuration): Promise<{ server: McpServer, transport?: StdioServerTransport, httpServer?: http.Server }> {
    const version = configuration.version;
    const server = new McpServer({
        name: name,
        version: version
    }, {
        capabilities: {
            tools: {
                listChanged: true
            }
        }
    });

    const toolDefinitions: ToolDefinition[] = [];
    const toolNames: string[] = [];

    for (const deploymentSpace of configuration.deploymentSpaces) {
        debug("deploymentSpace", deploymentSpace);
        
        let serviceIds = configuration.decisionServiceIds;
        debug("decisionServiceIds", JSON.stringify(configuration.decisionServiceIds));

        if (serviceIds === undefined || serviceIds.length === 0) {
            const spaceMetadata = await getMetadata(configuration, deploymentSpace);
            debug("spaceMetadata", JSON.stringify(spaceMetadata, null, " "));
             
            serviceIds = getDecisionServiceIds(spaceMetadata);
        }
        debug("serviceIds", JSON.stringify(serviceIds, null, " "));

        for (const serviceId of serviceIds) {
            debug("serviceId", serviceId);
            const openapi = await getDecisionServiceOpenAPI(configuration, deploymentSpace, serviceId);
            await registerTool(server, configuration, deploymentSpace, openapi, serviceId, toolNames, toolDefinitions);
        }
    }

    // Start polling for tool changes
    const pollInterval = configuration.pollInterval;
    debug(`Starting tool change polling with interval: ${pollInterval}ms`);
    const pollTimer = setInterval(async () => {
        debug("Polling for tool changes...");
        const hasChanges = await checkForToolChanges(server, configuration, toolDefinitions);
        if (hasChanges) {
            debug("Tool changes detected, sending notification to client");
            server.sendToolListChanged();
        }
    }, pollInterval);

    // Clean up interval on server close
    const originalClose = server.close.bind(server);
    server.close = async () => {
        clearInterval(pollTimer);
        return originalClose();
    };

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