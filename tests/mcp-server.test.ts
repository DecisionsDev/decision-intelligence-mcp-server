import {JSONRPCMessage, MessageExtraInfo} from "@modelcontextprotocol/sdk/types.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {Configuration} from "../src/command-line.js";
import {createMcpServer} from "../src/mcp-server.js";
import {PassThrough, Readable, Writable} from 'stream';
import {Credentials} from "../src/credentials.js";
import {setupNockMocks, validateClient, createAndConnectClient} from "./test-utils.js";

describe('Mcp Server', () => {

    function createTestEnvironment(deploymentSpaces: string[] = ['staging', 'production']) {
        const fakeStdin = new PassThrough();
        const fakeStdout = new PassThrough();
        const transport = new StdioServerTransport(fakeStdin, fakeStdout);
        const clientTransport = new StreamClientTransport(fakeStdout, fakeStdin);
        const configuration = new Configuration(
            Credentials.createDiApiKeyCredentials('dummy.api.key'),
            transport,
            'https://example.com',
            '1.2.3',
            true,
            deploymentSpaces,
            undefined,
            30000 // default poll interval
        );
        setupNockMocks(configuration);
        
        return {
            transport,
            clientTransport,
            configuration
        };
    }

    class StreamClientTransport implements Transport {
        public onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
        public onerror?: (error: Error) => void;
        public onclose?: () => void;
        public sessionId?: string;
        public setProtocolVersion?: (version: string) => void;

        constructor(
            private readonly readable: Readable,
            private readonly writable: Writable
        ) {}

        async start(): Promise<void> {
            this.readable.on("data", (chunk: Buffer) => {
                try {
                    const messages = chunk.toString().split('\n').filter(Boolean);
                    for (const line of messages) {
                        const msg: JSONRPCMessage = JSON.parse(line);
                        this.onmessage?.(msg); // You could pass extra info here if needed
                    }
                } catch (e) {
                    this.onerror?.(e instanceof Error ? e : new Error(String(e)));
                }
            });

            this.readable.on("error", (err) => {
                this.onerror?.(err);
            });

            this.readable.on("close", () => {
                this.onclose?.();
            });
        }

        async close(): Promise<void> {
            this.readable.removeAllListeners();
            this.writable.removeAllListeners();
            this.onclose?.();
        }

        async send(
            message: JSONRPCMessage
        ): Promise<void> {
            const json = JSON.stringify(message) + "\n";
            return new Promise<void>((resolve) => {
                if (this.writable.write(json)) {
                    resolve();
                } else {
                    this.writable.once("drain", resolve);
                }
            });
        }
    }

    test('should properly list and execute tool when configured with STDIO transport', async () => {
        const { transport, clientTransport, configuration } = createTestEnvironment();
        let server: McpServer | undefined;
        try {
            const result = await createMcpServer('toto', configuration);
            server = result.server;
            expect(server.isConnected()).toEqual(true);
            await validateClient(clientTransport, configuration.deploymentSpaces);
        } finally {
            await clientTransport?.close();
            await transport?.close();
            await server?.close();
        }
    });

    test('should advertise tools.listChanged capability', async () => {
        const { transport, clientTransport, configuration } = createTestEnvironment();
        let server: McpServer | undefined;
        try {
            const result = await createMcpServer('test-server', configuration);
            server = result.server;
            expect(server.isConnected()).toEqual(true);

            const client = await createAndConnectClient(clientTransport);

            // Check that the server advertises the tools.listChanged capability
            const serverCapabilities = (client as any)._serverCapabilities;
            expect(serverCapabilities).toBeDefined();
            expect(serverCapabilities.tools).toBeDefined();
            expect(serverCapabilities.tools.listChanged).toBe(true);

            await client.close();
        } finally {
            await clientTransport?.close();
            await transport?.close();
            await server?.close();
        }
    });

    function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Expected notification not received'));
            }, ms);
        });

        return Promise.race([promise, timeoutPromise]).finally(() => {
            clearTimeout(timeoutId);
        });
    }    

    test('should send notification when sendToolListChanged is called', async () => {
        const { transport, clientTransport, configuration } = createTestEnvironment();
        let server: McpServer | undefined;

        try {
            const result = await createMcpServer('test-server', configuration);
            server = result.server;
            expect(server.isConnected()).toEqual(true);

            // Set up a promise to capture the notification
            let notificationReceived = false;

            const notificationPromise = new Promise<void>((resolve) => {
                const originalOnMessage = clientTransport.onmessage;

                clientTransport.onmessage = (message: JSONRPCMessage) => {
                    if (originalOnMessage) {
                        originalOnMessage(message);
                    }

                    // Detect the notification
                    if ('method' in message && message.method === 'notifications/tools/list_changed') {
                        notificationReceived = true;
                        resolve();
                    }
                };
            });

            const client = await createAndConnectClient(clientTransport);

            // Trigger the server notification manually
            server.sendToolListChanged();

            // Wait for the notification with safe timeout (no timer leaks)
            await withTimeout(notificationPromise, 1000);

            expect(notificationReceived).toBe(true);

            await client.close();
        } finally {
            await clientTransport?.close();
            await transport?.close();
            await server?.close();
        }
    });    
});