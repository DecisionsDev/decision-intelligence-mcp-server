function walk(schema: any, defs: any, history: any): void {

    if (schema.type === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {

                var property = schema.properties[key];

                if (property.oneOf) {
                    var arr:any = [];
                    for (let i = 0; i < property.oneOf.length; i++) {
                        var subType = property.oneOf[i];
                        if (subType.type !== "null") {
                            arr.push(subType);
                        }
                    }        
                    if (arr.length == 1) {
                        delete(property.oneOf);
                        schema.properties[key] = arr[0];
                        property = schema.properties[key]
                    }
                }

                if (property['$ref']) {
                    var canonicalRef = property['$ref'];

                    var paths = canonicalRef.split('/');
                    var ref = paths[2];

                    if (history.includes(ref)) {
                        console.error("Circular reference detected for " + ref + " in history: " + history);
                        delete(schema['properties'][key]);
                        continue ;
                    } else {
                        schema.properties[key] = defs[ref];
                    }

                    delete(property['$ref'])
                    property = schema.properties[key];
                }

                if (property["type"] && Array.isArray(property.type) && property.type.length == 2 && property.type[1] === "null") {
                    property.type = property.type[0];
                } else {
                    walk(property, defs, history);                
                }
            }   
        }
    } else if (schema.oneOf) {
        for (let i = 0; i < schema.oneOf.length; i++) {
            var item = schema.oneOf[i];
            if (item['$ref']) {
                var canonicalRef = schema.oneOf[i]['$ref'];

                var paths = canonicalRef.split('/');
                var ref = paths[2];

                if (history.includes(ref)) {
                    console.error("Circular reference detected for " + ref + " in history: " + history);
                } else {
                    schema.oneOf[i] = defs[ref];
                }
            } else {
                walk(item, defs, [...history]);                
            }
        }               

        // replace oneOf by anyOf which deserves a better support in schemaToZod...
        schema["anyOf"] = schema.oneOf;
        delete(schema.oneOf);
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

