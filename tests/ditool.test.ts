import { getToolName } from '../src/ditool';

test('getToolName', () => {
    expect(getToolName("op", "dname", "did", [])).toEqual("dname_op");
    expect(getToolName("op", "dname", "did", ["dname_op"])).toEqual("did_op");
    expect(getToolName("op2", "dname", "did", ["dname_op"])).toEqual("dname_op2");
    expect(getToolName("op2", "dname", "did", ["dname_op", "dname_op2"])).toEqual("did_op2");
});