// const JsDocPlugin = require('jsdoc-webpack-plugin');

// eslint-disable-next-line prefer-const
let config = {
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
  // optimization: {
  //   minimize: false,
  // },
  // mode: 'development',
  // devtool: 'sourceMap',
};

module.exports = (env, argv) => {
  if (argv.mode === 'development') {
    config.mode = 'development';
    config.devtool = 'source-map';
    config.optimization = {
      minimize: false,
    };
  }

  if (argv.mode === 'production') {
    config.output.filename = 'musictheory.min.js';
  }

  return config;
};
