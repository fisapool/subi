const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    content: './src/content-script.js',
    popup: './src/popup.js',
    settings: './src/settings.js',
    'service-worker-loader': './src/service-worker-loader.js',
    'set-background-color': './src/set-background-color.js',
    redirect: './src/redirect.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  optimization: {
    minimize: false // Keep code readable for debugging
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'popup.html', to: '.' },
        { from: 'options.html', to: '.' },
        { from: 'popup_part2.html', to: '.' },
        { from: 'settings.html', to: '.' },
        { from: 'tasks.html', to: '.' },
        { from: 'session-buddy.html', to: '.' },
        { from: 'main.html', to: '.' },
        { from: 'popup.css', to: '.' },
        { from: 'popup_part2.css', to: '.' },
        { from: 'options.css', to: '.' },
        { 
          from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js', 
          to: 'browser-polyfill.min.js' 
        }
      ]
    })
  ]
}; 