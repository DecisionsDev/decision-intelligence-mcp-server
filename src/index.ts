#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { z } from 'zod';
import * as ts from "typescript";
import { expandJSONSchemaDefinition } from './jsonschema.js';
import { executeDecision, getDecisionOpenapi, getDecisionOperationJsonSchema } from './diruntimeclient.js';

function evalTS(code:string) {
    const result = ts.transpile(code);
    return eval(result);
}

const server = new McpServer({
    name: "di-mcp-server",
    version: "0.0.0"
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

console.error("APIKEY=" + apikey);
console.error("BASEURL=" + baseURL);
console.error("DECISION_ID=" + decisionId);
console.error("OPERATION=" + operation);

var decisionOpenAPI = await getDecisionOpenapi(apikey, baseURL, decisionId);
console.error("openapi", JSON.stringify(decisionOpenAPI));

var operationJsonSchemaStr = await getDecisionOperationJsonSchema(apikey, baseURL, decisionId, operation);
operationJsonSchemaStr = operationJsonSchemaStr.replaceAll(",{\"type\":\"null\"}", "");

// hack to remove the oneof that is not supported by the api converting jsschema to zod
const regex = /{\"oneOf\":\[([^\]]*)]}/g;
operationJsonSchemaStr = operationJsonSchemaStr.replaceAll(regex,"$1");

const operationName = JSON.parse(operationJsonSchemaStr).decisionOperation;
console.error("operationName", operationName);

var operationJsonSchema = JSON.parse(operationJsonSchemaStr).inputSchema;
console.error("operationJsonSchema", JSON.stringify(operationJsonSchema));

operationJsonSchema = expandJSONSchemaDefinition(operationJsonSchema)

// hack to ensure z which is used by the eval fct is present in the translated js
z.number;
var operationZodSchema = evalTS(jsonSchemaToZod(operationJsonSchema));

console.error("decisionOpenAPI.info.title", decisionOpenAPI.info.title);

// WO does not support white spaces for tool names
const toolName = (decisionOpenAPI.info.title + " " + operationName).replaceAll(" ", "_");

server.registerTool(
    toolName,
    {
        title: decisionOpenAPI.info.title + " " + operationName,
        description: decisionOpenAPI.info.description,
        inputSchema: { input: operationZodSchema }
    },
    async ({ input }) => {
        var str = await executeDecision(apikey, baseURL, decisionId, operation, input);
        return {
            content: [{ type: "text", text: str}]
        };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("DI MCP Server running on stdio");
