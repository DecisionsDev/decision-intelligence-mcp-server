#!/usr/bin/env node

import { program } from "commander";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { expandJSONSchemaDefinition } from './jsonschema.js';
import { executeLastDeployedDecisionService, getDecisionServiceIds, getDecisionServiceOpenAPI, getMetadata } from './diruntimeclient.js';
import { evalTS } from "./ts.js";
import { debug, setDebug, isDebug } from "./debug.js";
import { runHTTPServer } from "./httpserver.js";
import { DecisionRuntime, parseDecisionRuntime } from "./decision-runtime.js";

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

function registerTool(server: McpServer, apikey: string, baseURL: string, decisionOpenAPI: any, decisionServiceId: string, toolNames: string[]) {
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

        const serviceName = decisionOpenAPI.info["x-ibm-ads-decision-service-name"];
        debug("decisionServiceName", serviceName);

        // WO does not support white spaces for tool names
        // Claude does not support /
        var toolName = (serviceName + " " + operationId).replaceAll(" ", "_").replaceAll("/", "_");
        
        if (toolNames.includes(toolName)) {
            debug("toolName clash");
            toolName = (decisionServiceId + " " + operationId).replaceAll(" ", "_").replaceAll("/", "_");
        }
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

program
    .name("di-mcp-server")
    .description("MCP Server for IBM Decision Intelligence")
    .version(version)
    .option('--debug', 'Enable debug output')
    .option('--url <string>', "Base URL for the Decision Runtime API")
    .option('--apikey <string>', "API key for the Decision Runtime")
    .option('--transport <string>', "Transport mode: 'STDIO' or 'HTTP'")
    .option("--decision-runtime [runtime]", "Target Decision Runtime: 'DI' or 'ADS'. Default value is 'DI'");

program.parse();

const options = program.opts();

setDebug(options.debug || process.env.DEBUG === "true");
if (isDebug()) {
    debug("Debug output is enabled");
}

const apikey: string = options.apikey || process.env.APIKEY;
const baseURL: string = options.url || process.env.URL;
const transportMode: string = options.transport || process.env.TRANSPORT || "STDIO";
const decisionRuntimeOption = options["decisionRuntime"] || process.env.DECISION_RUNTIME;
const decisionRuntime = parseDecisionRuntime(decisionRuntimeOption || DecisionRuntime.DI);

debug("APIKEY=" + baseURL);
debug("URL=" + apikey);
debug("TRANSPORT=" + transportMode);
debug("DECISION_RUNTIME=" + decisionRuntime);

if (baseURL === undefined) {
    console.error("The URL of the Decision Runtime API is not defined");
    program.help();
}

if (apikey === undefined) {
    console.error("The Decision Runtime API key is not defined");
    program.help();
}

if (transportMode === undefined) {
    console.error("The transport mode is not defined");
    program.help();
}

if (decisionRuntime === undefined) {
    console.error(
        decisionRuntimeOption === undefined ?
            "The target Decision Runtime is not defined" :
            `'${decisionRuntimeOption}' is not a valid value for the target Decision Runtime`
    );
    program.help();
}

const server = new McpServer({
    name: "di-mcp-server",
    version: version
});

const spaceMetadata = await getMetadata(apikey, baseURL, "development");
debug("spaceMetadata", JSON.stringify(spaceMetadata, null, " "));
const serviceIds = getDecisionServiceIds(spaceMetadata);
debug("serviceIds", JSON.stringify(serviceIds, null, " "));

var toolNames: string[] = [];
for (const serviceId of serviceIds) {
    debug("serviceId", serviceId);
    const openapi = await getDecisionServiceOpenAPI(apikey, baseURL, serviceId);
    registerTool(server, apikey, baseURL, openapi, serviceId, toolNames);
}

if (transportMode === "HTTP") {
    debug("IBM Decision Intelligence MCP Server version", version, "running on http");
    runHTTPServer(server);
} else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
}