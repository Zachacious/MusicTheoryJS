const JsDocPlugin = require('jsdoc-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: ['babel-loader', 'eslint-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js'],
  },
  output: {
    path: `${__dirname}/dist`,
    publicPath: '/',
    filename: 'musictheory.js',
    libraryTarget: 'umd',
    // globalObject: 'this',
    library: 'MT',
  },
  plugins: [
    // new JsDocPlugin({
    //   conf: 'jsdoc.json',
    //   cwd: '.',
    //   preserveTmpFile: false,
    // }),
  ],
  devServer: {
    contentBase: './dist',
  },
  optimization: {
    minimize: false,
  },
  mode: 'development',
  devtool: 'sourceMap',
};
