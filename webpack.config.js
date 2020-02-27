const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
module.exports = {
	context: __dirname + '/src',
	mode: "development",
	optimization: {
		// We no not want to minimize our code.
		minimize: false
	},
	entry: {
		main: "./index.js",
	},
	output: {
		path: __dirname + '/dist',
		filename: 'map-view.bundle.js'
	},
	module: {
		rules: [{
			test: /\.html$/,
			use: [{
				loader: 'html-loader',
				options: {
					interpolate: true
				}
			}]
		}, {
			test: /\.css$/,
			use: ['style-loader', 'css-loader'],
		},
		{
			test: /\.less$/,
			use: ['style-loader', 'css-loader', 'less-loader'],
		},
		{
			test: /\.(png|jpeg|ttf|...)$/,
			use: [
				{ loader: 'url-loader' }
				// limit => file.size =< 8192 bytes ? DataURI : File
			]
		}
		],
	},
  plugins: [
    new HardSourceWebpackPlugin()
  ]
}
