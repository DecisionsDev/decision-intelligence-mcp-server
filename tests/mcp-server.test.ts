/*
 * Copyright contributors to the IBM ADS/Decision Intelligence MCP Server project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {JSONRPCMessage, MessageExtraInfo} from "@modelcontextprotocol/sdk/types.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {Configuration} from "../src/command-line.js";
import {createMcpServer} from "../src/mcp-server.js";
import {PassThrough, Readable, Writable} from 'stream';
import {Credentials} from "../src/credentials.js";
import {setupNockMocks, validateClient} from "./test-utils.js";

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

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();
    const transport = new StdioServerTransport(fakeStdin, fakeStdout);
    const clientTransport = new StreamClientTransport(fakeStdout, fakeStdin);
    const configuration = new Configuration(Credentials.createDiApiKeyCredentials('dummy.api.key'), transport, 'https://example.com', '1.2.3', true, ['staging', 'production']);

    beforeAll(() => {
        setupNockMocks(configuration);
    });

    test('should properly list and execute tool when configured with STDIO transport', async () => {
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
});
