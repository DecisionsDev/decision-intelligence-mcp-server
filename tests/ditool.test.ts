import {getToolName, generateToolName} from '../src/ditool.js';
import {Configuration} from "../src/command-line.js";
import {DecisionRuntime} from "../src/decision-runtime.js";
import nock from "nock";
import {Credentials} from "../src/credentials.js";

describe('generateToolName', () => {

    test('should use decision service name in priority', () => {
        expect(generateToolName("op", "dname", "did", [])).toEqual("dname_op");
        expect(generateToolName("op2", "dname", "did", ["dname_op"])).toEqual("dname_op2");
    });

    test('should use decision service id if a tool with the decision service name already exists', () => {
        expect(generateToolName("op", "dname", "did", ["dname_op"])).toEqual("did_op");
        expect(generateToolName("op2", "dname", "did", ["dname_op", "dname_op2"])).toEqual("did_op2");
    });

    test('should use decision service id if a tool with the decision service name already exists', () => {
        expect(generateToolName("op", "dname", "did", ["dname_op"])).toEqual("did_op");
        expect(generateToolName("op2", "dname", "did", ["dname_op"])).toEqual("dname_op2");
        expect(generateToolName("op2", "dname", "did", ["dname_op", "dname_op2"])).toEqual("did_op2");
    });

    test('should throw an error if the generated tool name already exists', () => {
        expect(() => {
            generateToolName("op", "dname", "did", ["dname_op", "did_op"])
        }).toThrow("Tool name did_op already exist");
    });
});

describe('getToolName', () => {

    const operationId = 'operation-id';
    const toolName = 'My tool name';
    const metadataName = `mcpToolName.${operationId}`;
    const decisionMetadata = {
        map : {
            [metadataName]: {
                "name": metadataName,
                "kind": "PLAIN",
                "readOnly": false,
                "value": toolName
            }
        }
    };

    const url = 'https://example.com';
    const decisionId = 'decision-id';
    nock(url)
        .get(`/deploymentSpaces/development/decisions/${decisionId}/metadata`)
        .reply(200, decisionMetadata)
        .get(`/deploymentSpaces/development/decisions/${decisionId}/metadata`)
        .reply(200, { map : {}});

    const configuration = new Configuration(Credentials.createDiApiKeyCredentials('apiKey'),  DecisionRuntime.DI,  undefined, url, '1.2.3', false);
    const decisionServiceName = 'decision-service-name';
    const info = {
        ['x-ibm-ads-decision-service-name'] : decisionServiceName,
        ['x-ibm-ads-decision-id'] : decisionId
    }

    test('should use the appropriate metadata if provided', () => {
        return expect(getToolName(configuration, info, operationId, 'decision-service-id', [])).resolves.
            toBe(toolName);
    });

    test('should invoke generateToolName if the appropriate metadata is not provided', async () => {
        return expect(getToolName(configuration, info, operationId, 'decision-service-id', [])).resolves.
            toBe(`${decisionServiceName}_${operationId}`);
    });
});
