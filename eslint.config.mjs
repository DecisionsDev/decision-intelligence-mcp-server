
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        "rules": {
            "@typescript-eslint/naming-convention": [
                "error",
                // Default camelCase for most things
                {
                    "selector": "default",
                    "format": ["camelCase"]
                },
                // Allow PascalCase for classes and types
                {
                    "selector": ["class", "interface", "typeAlias", "enum"],
                    "format": ["PascalCase"]
                },
                {
                    "selector": "classProperty",
                    "modifiers": ["static", "readonly"],
                    "format": ["UPPER_CASE"]
                },
                // Allow UPPER_CASE for enum members
                {
                    "selector": "enumMember",
                    "format": ["UPPER_CASE", "PascalCase"]
                }
            ]
        }
    });