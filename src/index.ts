#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { expandJSONSchemaDefinition } from './jsonschema.js';
import { executeDecision, getDecisionOpenapi, getDecisionOperationJsonSchema } from './diruntimeclient.js';
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

async function registerTool(server: McpServer, apikey: string, baseURL: string, decisionId: string, operationName: string) {
    var decisionOpenAPI = await getDecisionOpenapi(apikey, baseURL, decisionId);
    debug("openapi", JSON.stringify(decisionOpenAPI, null, " "));

    for (const key in decisionOpenAPI.paths) {
        const value = decisionOpenAPI.paths[key];
        const operationId = value.post.operationId;
        debug("path info", value);

        if (operationId === operationName) {
            debug("Found operationName", key);

            var operation = value.post.requestBody.content["application/json"];
            var inputSchema = operation.schema;
            debug("operation", operation);
            debug("inputSchema", inputSchema);

            var operationJsonInputSchema = expandJSONSchemaDefinition(inputSchema, decisionOpenAPI.components.schemas)
            debug("operationJsonSchema after expand", JSON.stringify(operationJsonInputSchema, null, " "));

            // WO does not support white spaces for tool names
            const toolName = (decisionOpenAPI.info.title + " " + operationName).replaceAll(" ", "_");

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
                    var str = await executeDecision(apikey, baseURL, decisionId, operationName, decInput);
                    return {
                        content: [{ type: "text", text: str}]
                    };
                }
            );
        }
    }
}

const version = String(process.env.npm_package_version);

const server = new McpServer({
    name: "di-mcp-server",
    version: version
});

var args = process.argv.slice(2);

if (args.length != 4) {
    console.error("USAGE: <APIKEY> <BASE_URL> <DECISION_ID> <OPERATION>");
    process.exit(1);
}
  
var apikey = args[0];
var baseURL = args[1];
var decisionId = args[2];
var operation = args[3];

debug("APIKEY=" + apikey);
debug("BASEURL=" + baseURL);
debug("DECISION_ID=" + decisionId);
debug("OPERATION=" + operation);

await registerTool(server, apikey, baseURL, decisionId, operation);

const transport = new StdioServerTransport();
await server.connect(transport);
debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
