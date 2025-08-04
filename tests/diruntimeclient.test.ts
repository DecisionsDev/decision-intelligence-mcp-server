import { getDecisionServiceIds, getDecisionServiceOpenAPI, getMetadata } from '../src/diruntimeclient';
import nock from 'nock';
import loanvalidationOpenapi from '../tests/loanvalidation-openapi.json';

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

nock('http://example.com')
    .get('/deploymentSpaces/development/metadata?names=decisionServiceId')
    .reply(200, metadata)
    .get('/deploymentSpaces/notexist/metadata?names=decisionServiceId')
    .reply(404)
    .get('/selectors/lastDeployedDecisionService/deploymentSpaces/development/openapi?decisionServiceId=ID1&outputFormat=JSON/openapi')
    .replyWithFile(200, 'tests/loanvalidation-openapi.json');

test('getDecisionServiceIds', () => {
    expect(getDecisionServiceIds(metadata)).toEqual(["ID1", "ID2"]);
});

test('getMetadata', async () => {
    return getMetadata('myapikey', 'http://example.com', 'development')
        .then(data => {
            expect(data).toEqual(metadata);
    });
});

test('getMetadata with not exist deploymentSpace', async () => {
    await expect(getMetadata('myapikey', 'http://example.com', 'notexist'))
        .rejects.toThrow('Request failed with status code 404');
});

test('getDecisionServiceOpenAPI', async() => {
    return getDecisionServiceOpenAPI('myapikey', 'http://example.com', 'ID1')
        .then(data => {
            expect(data).toEqual(loanvalidationOpenapi);
        })
});