const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './popup.js',
    background: './background.js',
    content: './content-script.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    module: true,
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'assets', to: 'assets' },
        { from: '_locales', to: '_locales' },
        { from: 'sidepanels', to: 'sidepanels' },
        { from: 'settings.html', to: 'settings.html' },
        { from: 'session-buddy.html', to: 'session-buddy.html' },
        { from: 'main.html', to: 'main.html' },
        { from: 'redirect.js', to: 'redirect.js' },
        { from: 'set-background-color.js', to: 'set-background-color.js' }
      ]
    })
  ]
}; 