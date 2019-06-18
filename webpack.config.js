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
				use: ['html-loader']
			}, {
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.less$/,
				use: ['style-loader','css-loader','less-loader'],
			}
		],
	},
}
