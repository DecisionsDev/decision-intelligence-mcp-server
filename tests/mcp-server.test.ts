import {JSONRPCMessage, MessageExtraInfo} from "@modelcontextprotocol/sdk/types.js";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {Configuration} from "../src/command-line.js";
import {DecisionRuntime} from "../src/decision-runtime.js";
import {createMcpServer} from "../src/mcp-server.js";
import {PassThrough, Readable, Writable} from 'stream';
import {Credentials} from "../src/credentials.js";
<<<<<<< HEAD
import {setupNockMocks, testConfiguration, validateClient} from "./test-utils.js";
=======
import {setupNockMocks, validateClient} from "./test-utils.js";
>>>>>>> 6443dfebb641d8c7cce26b112ad741d7fc8e2286

describe('Mcp Server', () => {

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

<<<<<<< HEAD
    test('should properly list and execute tool when configured with STDIO transport', async () => {
        const fakeStdin = new PassThrough();
        const fakeStdout = new PassThrough();
        const transport = new StdioServerTransport(fakeStdin, fakeStdout);
        const clientTransport = new StreamClientTransport(fakeStdout, fakeStdin);
        const configuration = new Configuration(Credentials.createDiApiKeyCredentials(testConfiguration.apiKey),  DecisionRuntime.DI,  transport, testConfiguration.url, '1.2.3', true);
=======
    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();
    const transport = new StdioServerTransport(fakeStdin, fakeStdout);
    const clientTransport = new StreamClientTransport(fakeStdout, fakeStdin);
    const configuration = new Configuration(Credentials.createDiApiKeyCredentials('dummy.api.key'),  DecisionRuntime.DI,  transport, 'https://example.com', '1.2.3', true);

    beforeAll(() => {
        setupNockMocks(configuration);
    });

test('should properly list and execute tool when configured with STDIO transport', async () => {
>>>>>>> 6443dfebb641d8c7cce26b112ad741d7fc8e2286
        let server: McpServer | undefined;
        let client: Client | undefined;
        try {
            const result = await createMcpServer('toto', configuration);
            server = result.server;
            expect(server.isConnected()).toEqual(true);

            client = new Client({
                    name: "string-analyzer-client",
                    version: "1.0.0",
                },
                {
                    capabilities: {},
                });
            await validateClient(client, clientTransport);
        } finally {
            await clientTransport?.close();
            await transport?.close();
            await server?.close();
            await client?.close();
        }
    });
});