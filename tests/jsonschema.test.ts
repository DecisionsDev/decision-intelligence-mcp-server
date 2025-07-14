import { expandJSONSchemaDefinition } from '../src/jsonschema';
import { expect, test } from '@jest/globals';

test('expandJSONSchemaDefinition returns empty object for empty input', () => {
    expect(expandJSONSchemaDefinition({})).toEqual({});
});

test('expandJSONSchemaDefinition returns the same object for simple schema', () => {
    const schema = { type: 'string' };
    expect(expandJSONSchemaDefinition(schema)).toEqual(schema);
});

test('expandJSONSchemaDefinition returns the same object for nested schema', () => {
    const schema = {
        type: 'object',
        properties: {
            name: { type: 'string' },
            age: { type: 'number' }
        }
    };
    expect(expandJSONSchemaDefinition(schema)).toEqual(schema);
});

test('expandJSONSchemaDefinition returns the same object for array schema', () => {
    const schema = {
        type: 'array',
        items: { type: 'integer' }
    };
    expect(expandJSONSchemaDefinition(schema)).toEqual(schema);
});

test('expandJSONSchemaDefinition returns the same object for schema with definitions', () => {
    const schema = {
        definitions: {
            address: {
                type: 'object',
                properties: {
                    street: { type: 'string' }
                }
            }
        }
    };
    expect(expandJSONSchemaDefinition(schema)).toEqual(schema);
});

test('expandJSONSchemaDefinition $ref using definitions', () => {
    const schema = {
        type: 'object',
        properties: {
            person: {
                $ref: '#/$defs/person'
            }
        },
        "$defs": {
            person: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' }
                }
            }
        }
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
    expect(expandJSONSchemaDefinition(schema)).toEqual(schemaRef);
});

