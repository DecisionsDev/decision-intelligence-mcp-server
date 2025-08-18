import {executeDecision, executeLastDeployedDecisionService, getDecisionMetadata, getDecisionOpenapi, getDecisionServiceIds, getDecisionServiceOpenAPI, getMetadata} from '../src/diruntimeclient.js';
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

const deploymentSpaceWithWhiteSpaces = `toto    toto`;
nock(url)
    .get('/deploymentSpaces/test/metadata?names=decisionServiceId')
    .matchHeader('authorization', `Basic ${encodedUsernamePassword}`)
    .reply(200, metadata)
    .get('/deploymentSpaces/nonexistent/metadata?names=decisionServiceId')
    .reply(404)
    .get('/selectors/lastDeployedDecisionService/deploymentSpaces/production/openapi?decisionServiceId=ID1&outputFormat=JSON/openapi')
    .matchHeader('apikey', apikey)
    .reply(200, loanValidationOpenapi)
    .post('/selectors/lastDeployedDecisionService/deploymentSpaces/foo.bar/operations/execute/execute?decisionServiceId=ID1')
    .matchHeader('apikey', apikey)
    .reply(200, { result: 'default-success' })
    .get('/deploymentSpaces/staging/decisions/decision123/openapi')
    .matchHeader('authorization', `ZenApiKey ${encodedUsernameApiKey}`)
    .reply(200, { openapi: '3.0.0' })
    .post(`/deploymentSpaces/${encodeURIComponent(deploymentSpaceWithWhiteSpaces)}/decisions/${decisionId}/operations/${operationId}/execute`, {})
    .matchHeader('authorization', `ZenApiKey ${encodedUsernameApiKey}`)
    .reply(200, executionResponse)
    .get(`/deploymentSpaces/tutu/decisions/${decisionId}/openapi`)
    .reply(200, loanValidationOpenapi)
    .get(`/deploymentSpaces/toto/decisions/${decisionId}/metadata`)
    .matchHeader('authorization', `Basic ${encodedUsernamePassword}`)
    .reply(200, decisionMetadata);

test('getDecisionServiceIds', () => {
    expect(getDecisionServiceIds(metadata)).toEqual(["ID1", "ID2"]);
});

test(`getMetadata with 'test' deployment space`, async () => {
    return getMetadata(basicAuthConfiguration, 'test')
        .then(data => {
            expect(data).toEqual(metadata);
    });
});

test('getMetadata with non existent deploymentSpace', async () => {
    await expect(getMetadata(zenApiKeyConfiguration, 'nonexistent'))
        .rejects.toThrow('Request failed with status code 404');
});

test(`getDecisionServiceOpenAPI with 'production' deploymentSpace`, async() => {
    return getDecisionServiceOpenAPI(diApiKeyConfiguration, 'production', 'ID1')
        .then(data => {
            expect(data).toEqual(loanValidationOpenapi);
        })
});

test(`executeLastDeployedDecisionService with 'foo.bar' deploymentSpace`, async() => {
    const input = { data: 'test' };
    return executeLastDeployedDecisionService(diApiKeyConfiguration, 'foo.bar', 'ID1', 'execute', input)
        .then(data => {
            expect(JSON.parse(data)).toEqual({ result: 'default-success' });
        })
});

test(`getDecisionOpenapi with 'staging' deploymentSpace`, async() => {
    return getDecisionOpenapi(zenApiKeyConfiguration, 'staging', 'decision123')
        .then(data => {
            expect(data).toEqual({ openapi: '3.0.0' });
        })
});

test(`executeDecision with '${deploymentSpaceWithWhiteSpaces}' deploymentSpace`, async () => {
    return executeDecision(zenApiKeyConfiguration, deploymentSpaceWithWhiteSpaces, decisionId, operationId, {})
        .then(data => {
            expect(data).toEqual(JSON.stringify(executionResponse));
        });
});

test(`getDecisionMetadata with 'toto' deploymentSpace`, async () => {
    return getDecisionMetadata(basicAuthConfiguration, 'toto', decisionId)
        .then(data => {
            expect(data).toEqual(decisionMetadata);
        })
});

test(`getDecisionOpenApi with 'tutu' deploymentSpace`, async () => {
    return getDecisionOpenapi(zenApiKeyConfiguration, 'tutu', decisionId)
        .then(data => {
            expect(data).toEqual(loanValidationOpenapi);
        });
});
