/*
 * Copyright contributors to the IBM ADS/Decision Intelligence MCP Server project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expandJSONSchemaDefinition } from '../src/jsonschema.js';
import { expect, test } from '@jest/globals';

test('expandJSONSchemaDefinition returns empty object for empty input', () => {
    expect(expandJSONSchemaDefinition({}, {})).toEqual({});
});

test('expandJSONSchemaDefinition returns the same object for simple schema', () => {
    const schema = { type: 'string' };
    expect(expandJSONSchemaDefinition(schema, {})).toEqual(schema);
});

test('expandJSONSchemaDefinition returns the same object for nested schema', () => {
    const schema = {
        type: 'object',
        properties: {
            name: { type: 'string' },
            age: { type: 'number' }
        }
    };
    expect(expandJSONSchemaDefinition(schema, {})).toEqual(schema);
});

test('expandJSONSchemaDefinition returns the same object for array schema', () => {
    const schema = {
        type: 'array',
        items: { type: 'integer' }
    };
    expect(expandJSONSchemaDefinition(schema, {})).toEqual(schema);
});

test('expandJSONSchemaDefinition returns the same object for schema', () => {
    const schema = {
        address: {
            type: 'object',
            properties: {
                street: { type: 'string' }
            }
        }
    };
    expect(expandJSONSchemaDefinition(schema, {})).toEqual(schema);
});

test('expandJSONSchemaDefinition $ref using definitions for properties', () => {
    const defs = {
        person: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                age: { type: 'integer' }
            }
        }
    };
    

    const schema = {
        type: 'object',
        properties: {
            person: {
                $ref: '#/components/schemas/person'
            }
        },
        
    };
    const schemaRef = {
        type: 'object',
        properties: {
            person: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' }
                }
            }
        }
    };
    expect(expandJSONSchemaDefinition(schema, defs)).toEqual(schemaRef);
});

test('expandJSONSchemaDefinition removes $ref definition from attribute', () => {
    const schema = {
        type: 'object',
        properties: {
            borrower: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    spouse: { $ref: "#/components/schemas/toto" }
                }
            }
        }
    };
    const expected = {
        type: 'object',
        properties: {
            borrower: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    spouse: { }
                }
            }
        }
    };
    const result = expandJSONSchemaDefinition(schema, {});
    expect(result).toEqual(expected);

    // Explicitly verify that borrower.spouse is an empty object
    const spouse = result.properties.borrower.properties.spouse;
    expect(spouse).toEqual({});
    expect(Object.keys(spouse).length).toBe(0);
});

test('expandJSONSchemaDefinition removes attributes with circular $ref definition', () => {
    const defs = {
        borrower: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                spouse: { $ref: "#/components/schemas/borrower" }
            }
        }
    };

    const schema = {
        type: 'object',
        properties: {
            input: {
                type: "object",
                properties: {
                    borrower: {
                        "$ref": "#/components/schemas/borrower"
                    }
                }
            },
        }
    };

    const expected = {
        type: 'object',
        properties: {
            input: {
                type: "object",
                properties: {
                    borrower: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                        }
                    }
                }
            }
        }
    };
    const result = expandJSONSchemaDefinition(schema, defs);
    expect(result).toEqual(expected);

    // Explicitly verify that borrower.spouse is undefined
    const spouse = result.properties.input.properties.borrower.properties.spouse;
    expect(spouse).toBeUndefined();
});
