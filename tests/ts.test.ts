import { evalTS } from '../src/ts';

test('evalTS', () => {
    expect(evalTS("1 + 2")).toEqual(3);
});