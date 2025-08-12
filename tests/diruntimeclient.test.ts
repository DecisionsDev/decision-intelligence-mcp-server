import nock from 'nock';
import loanvalidationOpenapi from '../tests/loanvalidation-openapi.json';
import {getDecisionMetadata, getDecisionServiceIds, getDecisionServiceOpenAPI, getMetadata} from '../src/diruntimeclient.js';
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
const apiKeyConfiguration = new Configuration(new Credentials({apikey : apikey}), runtime, undefined, url, version, false);
const username = 'username';
const password = 'password';
const encodedUsernamePassword= Buffer.from(`${username}:${password}`).toString('base64');
const basicAuthConfiguration = new Configuration(new Credentials({username: username, password: password}), runtime, undefined, url, version, false);
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
    .get('/deploymentSpaces/notexist/metadata?names=decisionServiceId')
    .reply(404)
    .get('/selectors/lastDeployedDecisionService/deploymentSpaces/development/openapi?decisionServiceId=ID1&outputFormat=JSON/openapi')
    .matchHeader('apikey', apikey)
    .reply(200, loanvalidationOpenapi)
    .get(`/deploymentSpaces/${deploymentSpaceId}/decisions/${decisionId}/metadata`)
    .matchHeader('authorization', `Basic ${encodedUsernamePassword}`)
    .reply(200, decisionMetadata);

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
    await expect(getMetadata(apiKeyConfiguration, 'notexist'))
        .rejects.toThrow('Request failed with status code 404');
});

test('getDecisionServiceOpenAPI', async() => {
    return getDecisionServiceOpenAPI(apiKeyConfiguration, 'ID1')
        .then(data => {
            expect(data).toEqual(loanvalidationOpenapi);
        })
});

test('getDecisionMetadata', async () => {
    return getDecisionMetadata(basicAuthConfiguration, deploymentSpaceId, decisionId)
        .then(data => {
            expect(data).toEqual(decisionMetadata);
        })
});

