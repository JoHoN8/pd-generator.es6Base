const   path = require('path'),
        webpack = require('webpack'),
        HtmlWebpackPlugin = require('html-webpack-plugin'),
        htmlConfig = {
            template: "./src/index.html",
            filename: "index.html",
            inject: "body"
        };


module.exports = {
    //context: path.resolve(__dirname, "app"),
    entry: './src/scripts/app.js',
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: './scripts/app.js',
        publicPath: '/'
    },
    module:{
        rules:[
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader' ]
                //allows for import of styles (import css from 'file.css');
            },
            {  
                test: /\.js$|\.jsx$/,
                //exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        "presets": [
                            ["es2015", {"modules": false}],
                            "stage-0"
                        ],
                        plugins: []
                    }
                }
            },
            {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                use: [ 'style-loader', 'file-loader' ]
            }
        ]
    },
    resolve: {
        extensions: [".js", ".jsx", ".css"]
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new HtmlWebpackPlugin(htmlConfig)
    ],
    devServer: {
        hot: true, // Tell the dev-server we're using HMR
        contentBase: './dist'
    }
    //devtool: 'source-map'
};

