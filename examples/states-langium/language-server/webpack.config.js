// @ts-check
const path = require('path');

const outputPath = path.resolve(__dirname, 'out');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node',

    entry: path.resolve(__dirname, 'src/main.ts'),
    output: {
		filename: 'language-server.js',
        path: outputPath
    },
    devtool: 'nosources-source-map',

    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: ['ts-loader']
            },
            {
                test: /\.js$/,
                use: ['source-map-loader'],
                enforce: 'pre'
            }
        ]
    }
};

module.exports = config;
