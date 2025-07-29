#!/usr/bin/env node

import { program } from "commander";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { expandJSONSchemaDefinition } from './jsonschema.js';
import { executeLastDeployedDecisionService, getDecisionServiceIds, getDecisionServiceOpenAPI, getMetadata } from './diruntimeclient.js';
import { evalTS } from "./ts.js";
import { debug, setDebug } from "./debug.js";
import { runHTTPServer } from "./httpserver.js";

type parametersType = {[key: string]: any};
type configType = {apikey: string, url: string, transport: string, debug: boolean};

const version = String(process.env.npm_package_version);

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

function parseCLI(): configType {
    program
        .name("di-mcp-server")
        .description("MCP Server for IBM Decision Intelligence")
        .version(version)
        .option('--debug', 'Enable debug output')
        .option('--url <string>', "Base URL for the Decision Runtime API")
        .option('--apikey <string>', "API key for the Decision Runtime")
        .option('--transport <string>', 'Transport mode: STDIO or HTTP');

    program.parse();

    const options = program.opts();

    return {
        apikey:  options.apikey || process.env.APIKEY,
        url: options.url || process.env.URL,
        transport: options.transport || process.env.TRANSPORT || "STDIO",
        debug: options.debug || process.env.DEBUG === "true"
    };
}

async function runServer(cfg: configType) {
    debug("APIKEY=" + cfg.apikey);
    debug("URL=" + cfg.url);
    debug("TRANSPORT=" + cfg.transport);

    const server = new McpServer({
        name: "di-mcp-server",
        version: version
    });

    const spaceMetadata = await getMetadata(cfg.apikey, cfg.url, "development");
    debug("spaceMetadata", JSON.stringify(spaceMetadata, null, " "));
    const serviceIds = getDecisionServiceIds(spaceMetadata);
    debug("serviceIds", JSON.stringify(serviceIds, null, " "));

    var toolNames: string[] = [];
    for (const serviceId of serviceIds) {
        debug("serviceId", serviceId);
        const openapi = await getDecisionServiceOpenAPI(cfg.apikey, cfg.url, serviceId);
        registerTool(server, cfg.apikey, cfg.url, openapi, serviceId, toolNames);
    }

    if (cfg.transport === "HTTP") {
        debug("IBM Decision Intelligence MCP Server version", version, "running on http");
        runHTTPServer(server);
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        debug("IBM Decision Intelligence MCP Server version", version, "running on stdio");
    }
}

const config = parseCLI();
setDebug(config.debug);
runServer(config);