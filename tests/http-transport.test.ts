import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Configuration } from "../src/command-line.js";
import { DecisionRuntime } from "../src/decision-runtime.js";
import { createMcpServer } from "../src/mcp-server.js";
import { Server } from "http";
import { TEST_CONFIG, TEST_INPUT, TEST_EXPECTATIONS, setupNockMocks, validateToolListing, validateToolExecution } from "./test-utils.js";
import { AddressInfo } from 'net';

describe('HTTP Transport', () => {
    beforeAll(() => {
        setupNockMocks();
    });

    test('should properly list and execute tool when configured with HTTP transport', async () => {
        // Create a custom configuration for HTTP transport
        const configuration = new Configuration('validkey123', DecisionRuntime.DI, undefined, TEST_CONFIG.url, '1.2.3', true);
        
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
            
            await client.connect(clientTransport);
            
            // Test tool listing
            const toolList = await client.listTools();
            validateToolListing(toolList.tools);
            
            // Test tool execution
            try {
                const response = await client.callTool({
                    name: TEST_EXPECTATIONS.tool.name,
                    arguments: TEST_INPUT
                });
                validateToolExecution(response);
            } catch (error) {
                console.error('Tool call failed:', error);
                throw error;
            }
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
