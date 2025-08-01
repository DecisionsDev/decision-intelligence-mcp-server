import * as ts from "typescript";
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function evalTS(code:string): any {
    // Create a function that includes z in its scope
    const evalFunction = new Function('z', `return ${ts.transpile(code)}`);
    return evalFunction(z);
}
