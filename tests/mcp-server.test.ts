import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {Configuration} from "../src/command-line.js";
import {DecisionRuntime} from "../src/decision-runtime.js";
import {createMcpServer} from "../src/mcp-server.js";
import nock from "nock";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";

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

    test('should be created if properly configured', async () => {
        const configuration = new Configuration('validkey123',  DecisionRuntime.DI,  "STDIO", url, '1.2.3', true);
        let mcpServer: McpServer | undefined;
        let clientTransport: InMemoryTransport | undefined;
        let serverTransport: InMemoryTransport | undefined;
        let client : Client | undefined;
        try {
            const result = await createMcpServer('toto', configuration);
            mcpServer = result.server;
            const transport = result.transport;
            expect(mcpServer.isConnected()).toEqual(true);

            await transport?.close();
            expect(mcpServer.isConnected()).toEqual(false);

            const transports = InMemoryTransport.createLinkedPair();
            clientTransport = transports[0]
            serverTransport = transports[1]

            const server = mcpServer.server;
            await server.connect(serverTransport);
            expect(mcpServer.isConnected()).toEqual(true);

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
            await serverTransport?.close();
            await mcpServer?.close();
            await client?.close();
        }
    });
});