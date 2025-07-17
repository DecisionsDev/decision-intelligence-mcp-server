import * as ts from "typescript";
import { z } from 'zod';

export function evalTS(code:string): string {
    // hack to ensure z which is used by the eval fct is present in the translated js
    z.number;
    
    return eval(ts.transpile(code));
}

