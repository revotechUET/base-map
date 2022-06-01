const HtmlWebpackDeployPlugin = require('html-webpack-deploy-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
	// context: __dirname + '/src',
	mode: "development",
	optimization: {
		// We no not want to minimize our code.
		minimize: false
	},
	entry: {
		main: "./src/index.js",
	},
	output: {
		path: __dirname + '/dist',
		filename: 'map-view.bundle.js'
	},
	module: {
		rules: [{
			test: /\.html$/,
			use: 'html-loader',
			// use: [{
			// loader: 'html-loader',
			// options: {
			// 	interpolate: true
			// }
			// }]
		}, {
			test: /\.css$/,
			use: ['style-loader', 'css-loader'],
			sideEffects: true,
		},
		{
			test: /\.less$/,
			use: ['style-loader', 'css-loader', 'less-loader'],
			sideEffects: true,
		},
		{
			test: /\.(png|jpeg|ttf|...)$/,
			loader: 'url-loader',
			options: {
				limit: 8192,
				outputPath: 'assets',
			},
		}
		],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './index.html',
			chunksSortMode: 'none',
		}),
		new HtmlWebpackDeployPlugin({
			append: false,
			assets: {
				copy: [
					{ from: './vendors', to: '../vendors' },
					{ from: './bower_components', to: '../bower_components' },
				],
			},
			packages: {
				'@revotechuet/misc-component': {
					copy: [{ from: 'dist/misc-components.js', to: 'misc-components.js' }],
					scripts: 'misc-components.js'
				},
				'@revotechuet/file-explorer': {
					copy: [{ from: 'dist/file-explorer-module.js', to: 'file-explorer-module.js' }],
					scripts: 'file-explorer-module.js'
				},
			}
		})
	]
}
