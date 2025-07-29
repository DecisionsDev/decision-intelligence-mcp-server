// decision-runtime.test.ts
import { DecisionRuntime, parseDecisionRuntime } from '../src/decision-runtime.js';

describe('Decision Runtime', () => {

    describe('parseDecisionRuntime', () => {

        test('should parse "DI" as DecisionRuntime.DI', () => {
            expect(parseDecisionRuntime("DI")).toEqual(DecisionRuntime.DI);
        });

        test('should parse "ADS" as DecisionRuntime.ADS', () => {
            expect(parseDecisionRuntime("ADS")).toEqual(DecisionRuntime.ADS);
        });

        test('should parse  "ODM" returns undefined', () => {
            expect(parseDecisionRuntime("ODM")).toEqual(undefined);
        });

        test('should parse  "odm" returns undefined', () => {
            expect(parseDecisionRuntime("odm")).toEqual(undefined);
        });
    });
});
