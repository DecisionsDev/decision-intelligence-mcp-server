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

async function registerTool(server: McpServer, apikey: string, baseURL: string, decisionId: string, operation: string) {
    var decisionOpenAPI = await getDecisionOpenapi(apikey, baseURL, decisionId);
    debug("openapi", JSON.stringify(decisionOpenAPI));

    var operationJsonSchemaStr = await getDecisionOperationJsonSchema(apikey, baseURL, decisionId, operation);

    const operationJsonSchema = JSON.parse(operationJsonSchemaStr);
    debug("operationJsonSchema", JSON.stringify(operationJsonSchema, null, " "));

    const operationName = operationJsonSchema.decisionOperation;
    debug("operationName", operationName);

    var operationJsonInputSchema = operationJsonSchema.inputSchema;
    debug("operationJsonInputSchema", JSON.stringify(operationJsonInputSchema));

    operationJsonInputSchema = expandJSONSchemaDefinition(operationJsonInputSchema)
    debug("operationJsonSchema after expand", JSON.stringify(operationJsonInputSchema, null, " "));

    debug("decisionOpenAPI.info.title", decisionOpenAPI.info.title);

    // WO does not support white spaces for tool names
    const toolName = (decisionOpenAPI.info.title + " " + operationName).replaceAll(" ", "_");

    const inputParameters:any = getParameters(operationJsonInputSchema);

    server.registerTool(
        toolName,
        {
            title: decisionOpenAPI.info.title + " " + operationName,
            description: decisionOpenAPI.info.description,
            inputSchema: inputParameters
        },
        async (input, n) => {
            var decInput = input;
            debug("Execute decision with", JSON.stringify(decInput, null, " "))
            var str = await executeDecision(apikey, baseURL, decisionId, operation, decInput);
            return {
                content: [{ type: "text", text: str}]
            };
        }
    );
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
