import { DecisionRuntime, parseDecisionRuntime } from '../src/decision-runtime.js';

test('Properly parse "DI" as DecisionRuntime.DI', () => {
    expect(parseDecisionRuntime("DI")).toEqual(DecisionRuntime.DI);
});

test('Properly parse "ADS" as DecisionRuntime.ADS', () => {
    expect(parseDecisionRuntime("ADS")).toEqual(DecisionRuntime.ADS);
});

test('Parsing "ODM" returns undefined', () => {
    expect(parseDecisionRuntime("ODM")).toEqual(undefined);
});

test('Parsing "odm" returns undefined', () => {
    expect(parseDecisionRuntime("odm")).toEqual(undefined);
});
