const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  watch: false,
  entry: './src/node.ts',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: 'source-map',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'scripts'),
  }
};