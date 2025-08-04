import {JSONRPCMessage, MessageExtraInfo} from "@modelcontextprotocol/sdk/types.js";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import type {Transport, TransportSendOptions} from '@modelcontextprotocol/sdk/shared/transport.js';
import {Configuration} from "../src/command-line.js";
import {DecisionRuntime} from "../src/decision-runtime.js";
import {createMcpServer} from "../src/mcp-server.js";
import nock from "nock";
import {PassThrough, Readable, Writable} from 'stream';

describe('Mcp Server', () => {

    const protocol = 'https:';
    const hostname = 'example.com';
    const url = `${protocol}//${hostname}`;

    const decisionServiceId = 'test/loan_approval/loanApprovalDecisionService/3-2025-06-18T13:00:39.447Z';
    const operationId = 'approval';
    const uri = '/selectors/lastDeployedDecisionService/deploymentSpaces/development/operations/' + encodeURIComponent(operationId) + '/execute?decisionServiceId=' + encodeURIComponent(decisionServiceId);
    const output = {
        "insurance": {
            "rate": 2.5,
            "required": true
        },
        "approval": {
            "approved": true,
            "message": "Loan approved based on income and credit score"
        }
    };
    nock(url)
        .get('/deploymentSpaces/development/metadata?names=decisionServiceId')
        .reply(200, [{
            'decisionServiceId': {
                'name': 'decisionServiceId',
                'kind': 'PLAIN',
                'readOnly': true,
                'value': decisionServiceId
            }
        }])
        .get(`/selectors/lastDeployedDecisionService/deploymentSpaces/development/openapi?decisionServiceId=${decisionServiceId}&outputFormat=JSON/openapi`)
        .replyWithFile(200, 'tests/loanvalidation-openapi.json')
        .post(uri)
        .reply(200, output);

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
            message: JSONRPCMessage,
            _options?: TransportSendOptions
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
        const fakeStdin = new PassThrough();
        const fakeStdout = new PassThrough();
        const transport = new StdioServerTransport(fakeStdin, fakeStdout);
        const clientTransport = new StreamClientTransport(fakeStdout, fakeStdin);
        const configuration = new Configuration('validkey123',  DecisionRuntime.DI,  transport, url, '1.2.3', true);
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
            await client.connect(clientTransport);
            const toolList = await client.listTools();
            expect(toolList).toHaveProperty('tools');
            const tools = toolList.tools;
            expect(Array.isArray(tools)).toBe(true);
            expect(tools).toHaveLength(1);

            const loanApprovalTool = tools[0];
            const toolName = 'Loan_Approval_approval';
            expect(loanApprovalTool).toEqual(
                expect.objectContaining({
                    name: toolName,
                    title: 'approval',
                    description: 'Execute approval'
                })
            );

            expect(loanApprovalTool).toHaveProperty('inputSchema');
            expect(typeof loanApprovalTool.inputSchema).toBe('object');

            const input = {
                loan: {
                    amount: 1000,
                    loanToValue: 1.5,
                    numberOfMonthlyPayments: 1000,
                    startDate: "2025-06-17T14:40:26Z"
                },
                borrower: {
                    SSN: {
                        areaNumber: "123",
                        groupCode: "45",
                        serialNumber: "6789"
                    },
                    birthDate: "1990-01-01T00:00:00Z",
                    creditScore: 750,
                    firstName: "Alice",
                    lastName: "Doe",
                    latestBankruptcy: {
                        chapter: 11,
                        date: "2010-01-01T00:00:00Z",
                        reason: "Medical debt"
                    },
                    yearlyIncome: 85000,
                    zipCode: "12345"
                },
                currentTime: new Date().toISOString()
            };

            try {
                const response = await client.callTool({
                    name: toolName,
                    arguments: input
                }, );
                expect(response).toBeDefined();
                expect(response.isError).toBe(undefined);
                const content = response.content as Array<{type: string, text: string}>;
                expect(content).toBeDefined();
                expect(Array.isArray(content)).toBe(true);
                expect(content).toHaveLength(1);
                const actualContent = content[0];
                expect(actualContent.text).toEqual(JSON.stringify(output));
            } catch (error) {
                console.error('Tool call failed:', error);
                throw error;
            }
        } finally {
            await clientTransport?.close();
            await transport?.close();
            await server?.close();
            await client?.close();
        }
    });
});