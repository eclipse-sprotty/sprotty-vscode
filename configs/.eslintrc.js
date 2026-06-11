const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const noNullPlugin = require('eslint-plugin-no-null');
const headerPlugin = require('eslint-plugin-header');
const prettierConfig = require('eslint-config-prettier');

const headerPluginWithSchema = {
    ...headerPlugin,
    rules: {
        ...headerPlugin.rules,
        header: {
            ...headerPlugin.rules.header,
            meta: {
                ...headerPlugin.rules.header.meta,
                schema: false
            }
        }
    }
};

module.exports = [
    prettierConfig,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                sourceType: 'module'
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            'no-null': noNullPlugin,
            '@typescript-eslint': tsPlugin,
            header: headerPluginWithSchema
        },
        rules: {
            '@typescript-eslint/naming-convention': 'off',
            '@typescript-eslint/no-dynamic-delete': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-misused-new': 'error',
            '@typescript-eslint/no-shadow': [
                'warn',
                {
                    hoist: 'all'
                }
            ],
            '@typescript-eslint/no-unused-expressions': 'off',
            semi: [
                'error',
                'always'
            ],
            'header/header': ['error', 'block', [{ pattern: '[\n\r]+ \\* Copyright \\([cC]\\) \\d{4}(-\\d{4})? .*[\n\r]+' }]],
            'brace-style': [
                'warn',
                '1tbs',
                { allowSingleLine: true }
            ],
            'comma-dangle': ['warn', {
                arrays: 'only-multiline',
                objects: 'only-multiline'
            }],
            'constructor-super': 'error',
            curly: 'off',
            'eol-last': 'warn',
            eqeqeq: [
                'warn',
                'smart'
            ],
            'guard-for-in': 'off',
            'id-blacklist': 'off',
            'id-match': 'off',
            'keyword-spacing': ['warn', { before: true }],
            'max-len': [
                'warn',
                {
                    code: 180
                }
            ],
            'no-prototype-builtins': 'error',
            'no-caller': 'error',
            'no-console': 'off',
            'no-debugger': 'warn',
            'no-eval': 'error',
            'no-fallthrough': 'warn',
            'no-invalid-this': 'warn',
            'no-new-wrappers': 'warn',
            'no-null/no-null': 'off',
            'no-redeclare': 'off',
            'no-restricted-imports': [
                'error',
                '..',
                '../index',
                '../..',
                '../../index'
            ],
            'no-return-await': 'warn',
            'no-sequences': 'error',
            'no-throw-literal': 'error',
            'no-trailing-spaces': 'warn',
            'no-underscore-dangle': 'off',
            'no-unsafe-finally': 'error',
            'no-var': 'error',
            'prefer-const': [
                'warn',
                {
                    destructuring: 'all'
                }
            ],
            'prefer-object-spread': 'warn',
            radix: 'warn',
            'spaced-comment': [
                'warn',
                'always',
                {
                    markers: [
                        '/'
                    ],
                    exceptions: [
                        '*'
                    ]
                }
            ],
            'space-infix-ops': 'warn',
            'use-isnan': 'warn'
        }
    }
];
