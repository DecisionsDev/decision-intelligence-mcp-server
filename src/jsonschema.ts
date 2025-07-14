function walk(schema: any, defs: any, history: any): void {

    if (schema.type === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {

                const property = schema.properties[key];

                if (property['$ref']) {
                    var canonicalRef = property['$ref'];

                    var paths = canonicalRef.split('/');
                    var ref = paths[2];

                    if (history.includes(ref)) {
                        console.error("Circular reference detected for " + ref + " in history: " + history);
                        delete(schema['properties'][key]);
                    } else {
                        schema.properties[key] = defs[ref];
                    }

                    delete(property['$ref'])
                }
                walk(property, defs, [...history, key]);
                
            }   
        }
    }
}

export function expandJSONSchemaDefinition(schema: any): object {
    var defs = schema['$defs'];

    var outSchema = {...schema};

    var defs = schema['$defs'];

    var expandedDefs = {... defs};

    Object.keys(expandedDefs).forEach((key) => {
        var def = defs[key];
        walk(def, expandedDefs, [key]);
    });

    delete(outSchema['$defs']);

    walk(outSchema, expandedDefs, []);

    return outSchema;
}