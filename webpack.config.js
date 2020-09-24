const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const CompressionPlugin = require('compression-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const plugins = [
  new CompressionPlugin({
    cache: true,
  }),
  new webpack.EnvironmentPlugin({
    LEGACY_INTEGRATIONS_PATH: 'https://ajs-next-integrations.s3-us-west-2.amazonaws.com',
    DEBUG: false,
  }),
]

if (process.env.ANALYZE) {
  plugins.push(new BundleAnalyzerPlugin())
}

const isProd = process.env.NODE_ENV === 'production'

const config = {
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  entry: {
    analytics: path.resolve(__dirname, 'src/index.ts'),
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/umd'),
    library: 'analytics',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'dist/umd'),
  },
  optimization: {
    moduleIds: 'hashed',
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: '2015',
          mangle: true,
          compress: true,
          output: {
            comments: false,
          },
        },
      }),
    ],
  },
  plugins,
}

module.exports = config
