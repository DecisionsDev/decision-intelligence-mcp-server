import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Configuration } from "../src/command-line.js";
import { DecisionRuntime } from "../src/decision-runtime.js";
import { createMcpServer } from "../src/mcp-server.js";
import { Server } from "http";
import { AddressInfo } from 'net';
import {Credentials} from "../src/credentials";
import {setupNockMocks, validateClient} from "./test-utils.js";

describe('HTTP Transport', () => {
    const configuration = new Configuration(Credentials.createDiApiKeyCredentials('validApiKey123'),  DecisionRuntime.DI,  undefined, 'https://foo.bar.bra,fr', '1.2.3', true);

    beforeAll(() => {
        setupNockMocks(configuration);
    });

    test('should properly list and execute tool when configured with HTTP transport', async () => {
        // Create a custom configuration for HTTP transport
        let server: McpServer | undefined;
        let httpServer: Server | undefined;
        let client: Client | undefined;
        
        let clientTransport: StreamableHTTPClientTransport | undefined;
        
        try {
            // Create MCP server with HTTP transport - this will return the HTTP server
            const result = await createMcpServer('test-server', configuration);
            server = result.server;
            httpServer = result.httpServer;

            if (!httpServer) {
                throw new Error('HTTP server not returned from createMcpServer');
            }
            
            // Create client with HTTP transport
            client = new Client(
                {
                    name: "http-client-test",
                    version: "1.0.0",
                },
                {
                    capabilities: {},
                }
            );
            
            // Connect client to server via HTTP
            const address = httpServer.address() as AddressInfo;
            clientTransport = new StreamableHTTPClientTransport(new URL(`http://localhost:${address.port}/mcp`));
            await validateClient(client, clientTransport)
        } finally {
            // Clean up resources in reverse order of creation
            if (client) {
                await client.close();
            }
            
            if (clientTransport) {
                try {
                    await clientTransport.close();
                } catch (e) {
                    console.error("Error closing client transport:", e);
                }
            }
            
            if (server) {
                try {
                    await server.close();
                } catch (e) {
                    console.error("Error closing server:", e);
                }
            }
            
            if (httpServer) {
                httpServer.closeAllConnections();
                httpServer.close();
            }
        }
    });
});
