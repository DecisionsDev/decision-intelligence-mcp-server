import { debug } from "./debug.js";

function walk(schema: any, defs: any, history: any): void {
    
    if (schema["type"] === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {
                const property = schema.properties[key];
                walk(property, defs, history);
            }   
        }
    } else if (schema["$ref"]) {
        const canonicalRef = schema['$ref'];

        const paths = canonicalRef.split('/');
        const ref = paths[3];

        if (history.includes(ref)) {
            debug("Circular reference detected for " + ref + " in history: " + history);
            delete(schema["$ref"]);
        } else {
            const def = defs[ref];
            for (const k in def) {
                schema[k] = def[k];
            }

            delete(schema["$ref"]);

            walk(schema, defs, [...history, ref]);
        }       
    }
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

