#!/usr/bin/env node

import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {jsonSchemaToZod} from "json-schema-to-zod";
import {expandJSONSchemaDefinition, jschemaType} from './jsonschema.js';
import {
    executeLastDeployedDecisionService,
    getDecisionServiceIds,
    getDecisionServiceOpenAPI,
    getMetadata
} from './diruntimeclient.js';
import {evalTS} from "./ts.js";
import {debug} from "./debug.js";
import {runHTTPServer} from "./httpserver.js";
import {createConfiguration} from "./command-line.js";
import { getToolName } from "./ditool.js";

type parametersType = {[key: string]: object|string};

function getParameters(jsonSchema: jschemaType): parametersType {
    const params: parametersType = {}

    for (const propName in jsonSchema.properties) {
        const jsonSchemaProp = jsonSchema.properties[propName];
        const code = jsonSchemaToZod(jsonSchemaProp);
        params[propName] = evalTS(code);
    }

    return params;
}

type openapiPathType = {};
type openapiType = { 
    info: {[key: string]: string}, 
    paths: undefined|{[key: string]: openapiPathType},
    components: any|undefined
};

function registerTool(server: McpServer, apikey: string, baseURL: string, decisionOpenAPI: openapiType, decisionServiceId: string, toolNames: string[]) {
    for (const key in decisionOpenAPI.paths) {
        const value = decisionOpenAPI.paths[key];
        const operationId = value.post.operationId;
        debug("path info", value);

        debug("Found operationName", key);

        const operation = value.post.requestBody.content["application/json"];
        const inputSchema = operation.schema;
        debug("operation", operation);
        debug("inputSchema", inputSchema);

        const operationJsonInputSchema: jschemaType = expandJSONSchemaDefinition(inputSchema, decisionOpenAPI.components.schemas)
        debug("operationJsonSchema after expand", JSON.stringify(operationJsonInputSchema, null, " "));

        const serviceName = decisionOpenAPI.info["x-ibm-ads-decision-service-name"];
        debug("decisionServiceName", serviceName);

        const toolName = getToolName(operationId, serviceName, decisionServiceId, toolNames);
        debug("toolName", toolName, toolNames);
        toolNames.push(toolName);

        const inputParameters:any = getParameters(operationJsonInputSchema);

        server.registerTool(
            toolName,
            {
                title: value.post.summary,
                description: value.post.description,
                inputSchema: inputParameters
            },
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

const configuration = createConfiguration();
const version = configuration.version;
const server = new McpServer({
    name: "di-mcp-server",
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