import { debug } from "./debug.js";

function walk(schema: any, defs: any, history: any): void {
    if (schema["type"] === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {
                var property = schema.properties[key];
                walk(property, defs, history);
            }   
        }
    } else if (schema["$ref"]) {
        var canonicalRef = schema['$ref'];

        var paths = canonicalRef.split('/');
        var ref = paths[3];

        if (history.includes(ref)) {
            console.error("Circular reference detected for " + ref + " in history: " + history);
            delete(schema["$ref"]);
        } else {
            var def = defs[ref];
            for (const k in def) {
                schema[k] = def[k];
            }

            delete(schema["$ref"]);

            walk(schema, defs, [...history, ref]);
        }       
    }
}

export function expandJSONSchemaDefinition(schema: any, defs: any): object {
    var outSchema = {...schema};

    var expandedDefs = {... defs};

    Object.keys(expandedDefs).forEach((key) => {
        var def = defs[key];
        walk(def, expandedDefs, [key]);
    });

    walk(outSchema, expandedDefs, []);

    return outSchema;
}

