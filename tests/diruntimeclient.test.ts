import {
    executeDecision,
    getDecisionMetadata,
    getDecisionOpenapi,
    getDecisionServiceIds,
    getDecisionServiceOpenAPI,
    getMetadata
} from '../src/diruntimeclient.js';
import nock from 'nock';
import { default as loanValidationOpenapi } from '../tests/loanvalidation-openapi.json';
import {Credentials} from "../src/credentials.js";
import {Configuration} from "../src/command-line.js";
import {DecisionRuntime} from "../src/decision-runtime.js";

const metadata =  [{
        "decisionServiceId": {
            "name": "decisionServiceId",
            "kind": "PLAIN",
            "readOnly": true,
            "value": "ID1"
        }
    }, {
        "decisionServiceId": {
            "name": "decisionServiceId",
            "kind": "PLAIN",
            "readOnly": true,
            "value": "ID1"
        }
    }, {
        "decisionServiceId": {
            "name": "decisionServiceId",
            "kind": "PLAIN",
            "readOnly": true,
            "value": "ID2"
    }
}];

const url = 'https://example.com';
const apikey = 'apiKey';
const version = '1.2.3';
const runtime = DecisionRuntime.DI;
const username = 'username';
const encodedUsernameApiKey= Buffer.from(`${username}:${apikey}`).toString('base64');
const diApiKeyConfiguration = new Configuration(Credentials.createDiApiKeyCredentials(apikey), runtime, undefined, url, version, false);
const zenApiKeyConfiguration = new Configuration(Credentials.createZenApiKeyCredentials(username, apikey), runtime, undefined, url, version, false);
const password = 'password';
const encodedUsernamePassword= Buffer.from(`${username}:${password}`).toString('base64');
const basicAuthConfiguration = new Configuration(Credentials.createBasicAuthCredentials(username, password), runtime, undefined, url, version, false);
const decisionId = 'decisionId';
const operationId = 'operationId';
const executionResponse = { answer: 42 };
const deploymentSpaceId = 'toto';
const decisionId = 'toto'
const decisionMetadata = {
    map : {
        "decisionServiceId": {
            "name": "decisionServiceId",
            "kind": "PLAIN",
            "readOnly": true,
            "value": "ID1"
        }
    }
};

nock(url)
    .get('/deploymentSpaces/development/metadata?names=decisionServiceId')
    .matchHeader('authorization', `Basic ${encodedUsernamePassword}`)
    .reply(200, metadata)
    .get('/deploymentSpaces/nonexistent/metadata?names=decisionServiceId')
    .reply(404)
    .get('/selectors/lastDeployedDecisionService/deploymentSpaces/development/openapi?decisionServiceId=ID1&outputFormat=JSON/openapi')
    .matchHeader('apikey', apikey)
    .reply(200, loanValidationOpenapi)
    .post(`/deploymentSpaces/development/decisions/${decisionId}/operations/${operationId}/execute`, {})
    .matchHeader('authorization', `ZenApiKey ${encodedUsernameApiKey}`)
    .reply(200, executionResponse)
    .get(`/deploymentSpaces/development/decisions/${decisionId}/openapi`)
    .reply(200, loanValidationOpenapi);
    .get(`/deploymentSpaces/${deploymentSpaceId}/decisions/${decisionId}/metadata`)
    .matchHeader('authorization', `Basic ${encodedUsernamePassword}`)
    .reply(200, decisionMetadata)
;

test('getDecisionServiceIds', () => {
    expect(getDecisionServiceIds(metadata)).toEqual(["ID1", "ID2"]);
});

test('getMetadata', async () => {
    return getMetadata(basicAuthConfiguration, 'development')
        .then(data => {
            expect(data).toEqual(metadata);
    });
});

test('getMetadata with not exist deploymentSpace', async () => {
    await expect(getMetadata(zenApiKeyConfiguration, 'nonexistent'))
        .rejects.toThrow('Request failed with status code 404');
});

test('getDecisionServiceOpenAPI', async() => {
    return getDecisionServiceOpenAPI(diApiKeyConfiguration, 'ID1')
        .then(data => {
            expect(data).toEqual(loanValidationOpenapi);
        })
});

test('executeDecision', async () => {
    return executeDecision(zenApiKeyConfiguration, decisionId, operationId, {})
        .then(data => {
            expect(data).toEqual(JSON.stringify(executionResponse));
        });
});

test('getDecisionOpenApi', async () => {
    return getDecisionOpenapi(zenApiKeyConfiguration, decisionId)
        .then(data => {
            expect(data).toEqual(loanValidationOpenapi);
        });
});

test('getDecisionMetadata', async () => {
    return getDecisionMetadata(basicAuthConfiguration, deploymentSpaceId, decisionId)
        .then(data => {
            expect(data).toEqual(decisionMetadata);
        })
});
