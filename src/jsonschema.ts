function walk(schema: any, defs: any, history: any): void {

    if (schema.type === 'object') {
        if (schema.properties) {
            for (const key in schema.properties) {
                var property = schema.properties[key];

                // remove oneOf: [XXXX, {"type":"null"}] which is poorly supported in practice
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

                // expand $ref
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
                        walk(schema.properties[key], defs, [...history, canonicalRef]);
                    }

                    delete(property['$ref'])
                    property = schema.properties[key];
                }

                // remove type = ["XXX", "null"] which is poorly supported in practice
                if (property["type"] && Array.isArray(property.type) && property.type.length == 2 && property.type[1] === "null") {
                    property.type = property.type[0];
                } 

                walk(property, defs, history);
            }   
        }
    } else if (schema.oneOf) {
        // replace oneOf by anyOf which deserves a better support in schemaToZod...
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
                    walk(schema.oneOf[i], defs, [...history, canonicalRef]);
                }
            } else {
                walk(item, defs, history);                
            }
        }               

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

