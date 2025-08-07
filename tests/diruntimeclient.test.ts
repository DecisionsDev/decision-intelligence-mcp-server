import {
    getDecisionMetadata,
    getDecisionServiceIds,
    getDecisionServiceOpenAPI,
    getMetadata
} from '../src/diruntimeclient.js';
import nock from 'nock';
import loanvalidationOpenapi from '../tests/loanvalidation-openapi.json';
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
const configuration = new Configuration( 'apiKey', DecisionRuntime.DI, undefined, url, '1.2.3', false);
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
    .reply(200, metadata)
    .get('/deploymentSpaces/notexist/metadata?names=decisionServiceId')
    .reply(404)
    .get('/selectors/lastDeployedDecisionService/deploymentSpaces/development/openapi?decisionServiceId=ID1&outputFormat=JSON/openapi')
    .replyWithFile(200, 'tests/loanvalidation-openapi.json')
    .get(`/deploymentSpaces/${deploymentSpaceId}/decisions/${decisionId}/metadata`)
    .reply(200, decisionMetadata)
;

test('getDecisionServiceIds', () => {
    expect(getDecisionServiceIds(metadata)).toEqual(["ID1", "ID2"]);
});

test('getMetadata', async () => {
    return getMetadata(configuration, 'development')
        .then(data => {
            expect(data).toEqual(metadata);
    });
});

test('getMetadata with not exist deploymentSpace', async () => {
    await expect(getMetadata(configuration, 'notexist'))
        .rejects.toThrow('Request failed with status code 404');
});

test('getDecisionServiceOpenAPI', async() => {
    return getDecisionServiceOpenAPI(configuration, 'ID1')
        .then(data => {
            expect(data).toEqual(loanvalidationOpenapi);
        })
});

test('getDecisionMetadata', async () => {
    return getDecisionMetadata(configuration, deploymentSpaceId, decisionId)
        .then(data => {
            expect(data).toEqual(decisionMetadata);
        })
});

