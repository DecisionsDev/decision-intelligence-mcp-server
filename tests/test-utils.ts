import nock from "nock";

// Shared test data
export const TEST_CONFIG = {
    protocol: 'https:',
    hostname: 'example.com',
    url: 'https://example.com',
    decisionServiceId: 'test/loan_approval/loanApprovalDecisionService/3-2025-06-18T13:00:39.447Z',
    operationId: 'approval',
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

// Shared test input data
export const TEST_INPUT = {
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

// Shared test expectations
export const TEST_EXPECTATIONS = {
    toolName: 'Loan_Approval_approval',
    expectedTool: {
        name: 'Loan_Approval_approval',
        title: 'approval',
        description: 'Execute approval'
    }
};

// Setup nock mocks for testing
export function setupNockMocks(): void {
    const { url, decisionServiceId, operationId, output } = TEST_CONFIG;
    const uri = '/selectors/lastDeployedDecisionService/deploymentSpaces/development/operations/' + 
                encodeURIComponent(operationId) + '/execute?decisionServiceId=' + 
                encodeURIComponent(decisionServiceId);
    
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
}

// Helper function to validate tool listing
export function validateToolListing(tools: any[]): void {
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(1);
    
    const loanApprovalTool = tools[0];
    expect(loanApprovalTool).toEqual(
        expect.objectContaining(TEST_EXPECTATIONS.expectedTool)
    );
    
    expect(loanApprovalTool).toHaveProperty('inputSchema');
    expect(typeof loanApprovalTool.inputSchema).toBe('object');
}

// Helper function to validate tool execution
export function validateToolExecution(response: any): void {
    expect(response).toBeDefined();
    expect(response.isError).toBe(undefined);
    const content = response.content as Array<{type: string, text: string}>;
    expect(content).toBeDefined();
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    const actualContent = content[0];
    expect(actualContent.text).toEqual(JSON.stringify(TEST_CONFIG.output));
}
