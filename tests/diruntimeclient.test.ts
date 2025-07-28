import { getDecisionServiceIds, getMetadata } from '../src/diruntimeclient';
import nock from 'nock';

test('getDecisionServiceIds', () => {
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

    expect(getDecisionServiceIds(metadata)).toEqual(["ID1", "ID2"]);
});

test('getMetadata', () => {
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

    const runtimeNock = nock('http://example.com')
        .get('/deploymentSpaces/development/metadata?names=decisionServiceId')
        .reply(200, metadata);

        getMetadata('myapikey', 'http://example.com', 'development')
            .then(data => {
                expect(data).toEqual(metadata);
        });
});
