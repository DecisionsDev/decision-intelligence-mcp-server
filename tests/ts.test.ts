import { evalTS } from '../src/ts.js';

test('evalTS', () => {
    expect(evalTS("1 + 2")).toEqual(3);
});