import nock from "nock";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';

// Shared test data
const toolName = 'my tool name';
const protocol =  'https:';
const hostname = 'example.com';

export const testConfiguration = {
    url : `${protocol}//${hostname}`,
    apiKey: 'validKey123',
    decisionServiceId: 'test/Loan Approval',
    decisionId: 'test/loan_approval/loanApprovalDecisionService/3-2025-06-18T13:00:39.447Z',
    operationId: 'approval',
    toolName: toolName,
    output: {
        "insurance": {
            "rate": 2.5,
            "required": true
        },
        "approval": {
            "approved": true,
            "message": "Loan approved based on income and credit score"
        }
    }
};

const testInput = {
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

const testExpectations = {
    tool: {
        name: toolName,
        title: 'approval',
        description: 'Execute approval'
    }
};

// Setup nock mocks for testing
export function setupNockMocks(): void {
    const { apiKey, decisionId, decisionServiceId, operationId, toolName, output } = testConfiguration;
    const uri = '/selectors/lastDeployedDecisionService/deploymentSpaces/development/operations/' + 
                encodeURIComponent(operationId) + '/execute?decisionServiceId=' + 
                encodeURIComponent(decisionServiceId);
    const metadataName = `mcpToolName.${operationId}`;
    nock(testConfiguration.url)
        .get('/deploymentSpaces/development/metadata?names=decisionServiceId')
        .matchHeader('apikey', apiKey)
        .reply(200, [{
            'decisionServiceId': {
                'name': 'decisionServiceId',
                'kind': 'PLAIN',
                'readOnly': true,
                'value': decisionServiceId
            }
        }])
        .get(`/deploymentSpaces/development/decisions/${encodeURIComponent(decisionId)}/metadata`)
        .reply(200, {
            map : {
                [metadataName] : {
                    'name': metadataName,
                    'kind': 'PLAIN',
                    'readOnly': false,
                    'value': toolName
                }
            }
        })
        .get(`/selectors/lastDeployedDecisionService/deploymentSpaces/development/openapi?decisionServiceId=${decisionServiceId}&outputFormat=JSON/openapi`)
        .matchHeader('apikey', apiKey)
        .replyWithFile(200, 'tests/loanvalidation-openapi.json')
        .post(uri)
        .matchHeader('apikey', apiKey)
        .reply(200, output);
}

export async function validateClient(client: Client, clientTransport: Transport) {
    await client.connect(clientTransport);
    const toolList = await client.listTools();
    validateToolListing(toolList.tools);

    try {
        const response = await client.callTool({
            name: testExpectations.tool.name,
            arguments: testInput
        });
        validateToolExecution(response);
    } catch (error) {
        console.error('Tool call failed:', error);
        throw error;
    }
}

function validateToolListing(tools: any[]): void {
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(1);
    
    const loanApprovalTool = tools[0];
    expect(loanApprovalTool).toEqual(
        expect.objectContaining(testExpectations.tool)
    );
    
    expect(loanApprovalTool).toHaveProperty('inputSchema');
    expect(typeof loanApprovalTool.inputSchema).toBe('object');
}

function validateToolExecution(response: any): void {
    expect(response).toBeDefined();
    expect(response.isError).toBe(undefined);
    const content = response.content as Array<{type: string, text: string}>;
    expect(content).toBeDefined();
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    const actualContent = content[0];
    expect(actualContent.text).toEqual(JSON.stringify(testConfiguration.output));
}
