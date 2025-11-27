/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAPIV3_1 } from "openapi-types";
import { debug } from "./debug.js";

function walk(schema: OpenAPIV3_1.SchemaObject, defs: any, history: any): boolean {
    
    if (schema.type === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {
                const property = schema.properties[key];
                if (walk(property, defs, history)) {
                    delete((schema.properties as any)[key]);
                }
            }   
        }
        return false;
    }
    if ((schema as any)["$ref"]) {
        const canonicalRef = (schema as any)['$ref'];

        const paths = canonicalRef.split('/');
        const ref = paths[3];

        if (history.includes(ref)) {
            debug("Circular reference detected for " + ref + " in history: " + history);
            delete((schema as any)["$ref"]);
            return true;
        }
        const def = defs[ref];
        for (const k in def) {
            (schema as any)[k] = def[k];
        }
        delete((schema as any)["$ref"]);
        walk(schema, defs, [...history, ref]);
        return false
    }
    return false
}

export function expandJSONSchemaDefinition(schema: any, defs: any): any {
    const outSchema = {...schema};

    const expandedDefs = {... defs};

    Object.keys(expandedDefs).forEach((key) => {
        const def = defs[key];
        walk(def, expandedDefs, [key]);
    });

    walk(outSchema, expandedDefs, []);

    return outSchema;
}

