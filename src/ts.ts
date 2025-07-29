import * as ts from "typescript";
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function evalTS(code:string): any {
    // hack to ensure zod import which is used by the eval fct is present in the translated js
    // eslint-disable-next-line
    z.number;
    
    return eval(ts.transpile(code));
}

