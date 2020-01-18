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
    library: '',
  },
  devServer: {
    contentBase: './dist',
  },
  optimization: {
    minimize: false,
  },
  mode: 'development',
  devtool: 'sourceMap',
};
