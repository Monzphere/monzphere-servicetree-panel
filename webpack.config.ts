import path from 'path';
import { Configuration } from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin');
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

const pkg = require('./package.json');
const pluginJson = require('./src/plugin.json');

const config = (env: Record<string, unknown> = {}): Configuration => {
  const isProd = env.production === true;
  return {
    cache: { type: 'filesystem' },
    context: path.join(process.cwd(), 'src'),
    devtool: isProd ? 'source-map' : 'eval-source-map',
    entry: { module: path.join(process.cwd(), 'src/module.ts') },
    externals: [
      'lodash',
      'jquery',
      'moment',
      'slate',
      'emotion',
      '@emotion/react',
      '@emotion/css',
      'prismjs',
      'slate-plain-serializer',
      '@grafana/slate-react',
      'react',
      'react-dom',
      'react-redux',
      'redux',
      'rxjs',
      'react-router',
      'react-router-dom',
      'd3',
      'angular',
      '@grafana/ui',
      '@grafana/runtime',
      '@grafana/data',
      '@grafana/schema',
    ],
    mode: isProd ? 'production' : 'development',
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'swc-loader',
              options: {
                jsc: {
                  parser: { syntax: 'typescript', tsx: true, decorators: false },
                  transform: { react: { runtime: 'automatic' } },
                  target: 'es2020',
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.svg$/,
          type: 'asset/resource',
          generator: { filename: 'img/[name][ext]' },
        },
        {
          test: /\.(png|jpg|jpeg|gif)$/,
          type: 'asset/resource',
          generator: { filename: 'img/[name][ext]' },
        },
      ],
    },
    optimization: {
      minimize: isProd,
      minimizer: [new TerserPlugin({ extractComments: false })],
    },
    output: {
      clean: true,
      filename: '[name].js',
      library: { type: 'amd' },
      path: path.resolve(process.cwd(), 'dist'),
      publicPath: `public/plugins/${pluginJson.id}/`,
      uniqueName: pluginJson.id,
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: { configFile: path.join(process.cwd(), 'tsconfig.json') },
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'plugin.json', to: '.' },
          { from: 'img/**/*', to: '.', noErrorOnMissing: true },
          { from: '../README.md', to: '.' },
          { from: '../CHANGELOG.md', to: '.' },
          { from: '../LICENSE', to: '.' },
        ],
      }),
      new ReplaceInFileWebpackPlugin([
        {
          dir: 'dist',
          files: ['plugin.json'],
          rules: [
            { search: /%VERSION%/g, replace: pkg.version },
            { search: /%TODAY%/g, replace: new Date().toISOString().split('T')[0] },
          ],
        },
      ]),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  };
};

export default config;
