#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { expandJSONSchemaDefinition } from './jsonschema.js';
import { executeLastDeployedDecisionService, getDecisionServiceIds, getDecisionServiceOpenAPI, getMetadata } from './diruntimeclient.js';
import { evalTS } from "./ts.js";
import { debug } from "./debug.js";

type parametersType = {[key: string]: any};

function getParameters(jsonSchema:any): parametersType {
    var params:any = {}

    for (const propName in jsonSchema.properties) {
        var jsonSchemaProp = jsonSchema.properties[propName];
        var code = jsonSchemaToZod(jsonSchemaProp);
        var zodSchema = evalTS(code);

        params[propName] = zodSchema;
    }

    return params;
}

function registerTool(server: McpServer, apikey: string, baseURL: string, decisionOpenAPI: any, decisionServiceId: string) {
    for (const key in decisionOpenAPI.paths) {
        const value = decisionOpenAPI.paths[key];
        const operationId = value.post.operationId;
        debug("path info", value);

        debug("Found operationName", key);

        var operation = value.post.requestBody.content["application/json"];
        var inputSchema = operation.schema;
        debug("operation", operation);
        debug("inputSchema", inputSchema);

        var operationJsonInputSchema = expandJSONSchemaDefinition(inputSchema, decisionOpenAPI.components.schemas)
        debug("operationJsonSchema after expand", JSON.stringify(operationJsonInputSchema, null, " "));

        // WO does not support white spaces for tool names
        var toolName = (decisionServiceId + " " + operationId).replaceAll(" ", "_");
        // WO does not support /
        toolName = toolName.replaceAll("/", "_");

        const inputParameters:any = getParameters(operationJsonInputSchema);

        server.registerTool(
            toolName,
            {
                title: value.post.summary,
                description: value.post.description,
                inputSchema: inputParameters
            },
            async (input, n) => {
                var decInput = input;
                debug("Execute decision with", JSON.stringify(decInput, null, " "))
                var str = await executeLastDeployedDecisionService(apikey, baseURL, decisionServiceId, operationId, decInput);
                return {
                    content: [{ type: "text", text: str}]
                };
            }
        );
    }
}

const version = String(process.env.npm_package_version);

const server = new McpServer({
    name: "di-mcp-server",
    version: version
});

var args = process.argv.slice(2);

if (args.length != 2) {
    console.error("USAGE: <APIKEY> <BASE_URL>");
    process.exit(1);
}
  
var apikey = args[0];
var baseURL = args[1];

debug("APIKEY=" + apikey);
debug("BASEURL=" + baseURL);

const spaceMetadata = await getMetadata(apikey, baseURL, "development");
debug("spaceMetadata", JSON.stringify(spaceMetadata, null, " "));
const serviceIds = getDecisionServiceIds(spaceMetadata);
debug("serviceIds", JSON.stringify(serviceIds, null, " "));

for (const serviceId of serviceIds) {
    debug("serviceId", serviceId);
    const openapi = await getDecisionServiceOpenAPI(apikey, baseURL, serviceId);
    registerTool(server, apikey, baseURL, openapi, serviceId);
}

const transport = new StdioServerTransport();
await server.connect(transport);
debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
