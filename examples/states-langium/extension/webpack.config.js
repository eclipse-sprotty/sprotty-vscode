//@ts-check
'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node',

    entry: path.resolve(__dirname, 'src/states-extension.ts'),
    output: {
        path: path.resolve(__dirname, 'pack'),
        filename: 'states-extension.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: {
        vscode: "commonjs vscode"
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: ['ts-loader']
            },
            {
                test: /\.js$/,
                enforce: 'pre',
                use: ['source-map-loader'],
            }
        ]
    },
    ignoreWarnings: [/Failed to parse source map/]
}

module.exports = config;
