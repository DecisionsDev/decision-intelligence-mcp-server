#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { jsonSchemaToZod } from "json-schema-to-zod";
import axios from 'axios';
import { z } from 'zod';
import * as ts from "typescript";
import { expandJSONSchemaDefinition } from './jsonschema.js';

function evalTS(code:string) {
    const result = ts.transpile(code);
    return eval(result);
}

function executeDecision(apikey:string, baseURL:string, decisionId:string, operation:string, input:any) {
  var url = baseURL + "/deploymentSpaces/development/decisions/" 
      + encodeURIComponent(decisionId) 
      + "/operations/" 
      + encodeURIComponent(operation)
      +"/execute";

    console.error("URL=" + url);

    var headers = {
        "Content-Type": "application/json",
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.post(url, "{}", { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}

function getDecisionOpenapi(apikey:string, baseURL:string, decisionId:string) {
  var url = baseURL + "/deploymentSpaces/development/decisions/" 
      + encodeURIComponent(decisionId) 
      + "/openapi";

    console.error("URL=" + url);

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}

function getDecisionOperationJsonSchema(apikey:string, baseURL:string, decisionId:string, operation:string) {
    var url = baseURL + "/deploymentSpaces/development/decisions/"
      + encodeURIComponent(decisionId)
      + "/operations/"
      + encodeURIComponent(operation)
      + "/schemas?format=JSON_SCHEMA";

    console.error("URL=" + url);

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
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

var operationJsonSchemaStr = await getDecisionOperationJsonSchema(apikey, baseURL, decisionId, operation);
operationJsonSchemaStr = operationJsonSchemaStr.replaceAll(",{\"type\":\"null\"}", "");

// hack to remove the oneof that is not supported by the api converting jsschema to zod
const regex = /{\"oneOf\":\[([^\]]*)]}/g;
operationJsonSchemaStr = operationJsonSchemaStr.replaceAll(regex,"$1");
console.error(operationJsonSchemaStr);

var operationJsonSchema = JSON.parse(operationJsonSchemaStr).inputSchema;
operationJsonSchema = expandJSONSchemaDefinition(operationJsonSchema)
console.error("operationJsonSchema", JSON.stringify(operationJsonSchema));

// hack to ensure z which is used by the eval fct is present in the translated js
z.number;
var operationZodSchema = eval(jsonSchemaToZod(operationJsonSchema));

server.registerTool(
    "LoanValidation",
    {
        title: "LoanValidation",
        description: "LoanValidation",
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
