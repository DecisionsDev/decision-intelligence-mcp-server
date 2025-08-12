
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        "rules": {
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    "selector": "default",
                    "format": ["camelCase"]
                },
                {
                    "selector": ["class", "interface", "typeAlias", "enum"],
                    "format": ["PascalCase"]
                },
                {
                    "selector": "classProperty",
                    "modifiers": ["static", "readonly"],
                    "format": ["UPPER_CASE"]
                },
                {
                    "selector": "enumMember",
                    "format": ["UPPER_CASE", "PascalCase"]
                },
                {
                    "selector": "objectLiteralProperty",
                    "format": ["UPPER_CASE", "camelCase"]
                }
            ]
        }
    });