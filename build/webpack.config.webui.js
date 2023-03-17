const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')

const svgToMiniDataURI = require('mini-svg-data-uri')

const rootDir = path.resolve(__dirname, '..')

module.exports = (env = {}, argv = {}) => {
  const onlyPrintingGraph = !!env.PRINT_WEBPACK_GRAPH;
  const outputPath = argv['output-path']

  const defines = {
    BUILDFLAG: onlyPrintingGraph ? '(a => a)' : ''
  };

  if (env.buildflags) {
    const flagFile = fs.readFileSync(env.buildflags, 'utf8');
    for (const line of flagFile.split(/(\r\n|\r|\n)/g)) {
        const flagMatch = line.match(/#define BUILDFLAG_INTERNAL_(.+?)\(\) \(([01])\)/);
        if (flagMatch) {
          const [, flagName, flagValue] = flagMatch;
          defines[flagName] = JSON.stringify(Boolean(parseInt(flagValue, 10)));
        }
    }
  }

  return {
    mode: env.mode || 'development',
    devtool: false,
    entry: {
      'mpv': path.join(rootDir, 'webui', 'mpv'),
    },
    target: 'web',
    experiments: {
      outputModule: true,
    },
    output: {
      module: true,
      path: outputPath,
      filename: '[name].bundle.js'
    },
  
    module: {
      rules: [
        {
          test: /\.(png|gif|jpg|woff|woff2|eot|ttf)$/,
          type: 'asset/inline',
        },
        {
          test: /\.svg/,
          type: 'asset/inline',
          generator: {
            dataUrl: content => {
              content = content.toString();
              return svgToMiniDataURI(content);
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(yml|yaml)$/,
          loader: 'yml-loader'
        },
        {
          resourceQuery: /source/,
          type: 'asset/source'
        },
      ]
    },

    externalsType: 'module',
    externals: {
    },

    plugins: [
    ],

    optimization: {
        minimize: env.mode === 'production',
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              keep_classnames: false,
              keep_fnames: false
            }
          })
        ]
    },
  }
}
