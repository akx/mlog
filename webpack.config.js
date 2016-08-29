module.exports = {
    context: __dirname,
    entry: './index.js',
    output: {
        path: __dirname,
        filename: 'bundle.js',
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {test: /\.js$/, loader: 'buble', exclude: /node_modules/},
            {test: /\.styl$/, loader: 'style-loader!css-loader!stylus-loader'},
        ],
    },
};
