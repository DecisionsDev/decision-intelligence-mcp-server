import { getDecisionServiceIds } from '../src/diruntimeclient';

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