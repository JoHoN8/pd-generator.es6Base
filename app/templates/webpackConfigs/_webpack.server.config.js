const   path = require('path'),
        webpack = require('webpack');


module.exports = {
    //context: path.resolve(__dirname, "app"),
    entry: './src/scripts/app.js',
    output: {
        path: path.resolve(__dirname, "./dist/scripts"),
        filename: 'app.js',
        publicPath: '/scripts/app'
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
                            "react",
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
        new webpack.HotModuleReplacementPlugin()
    ],
    devServer: {
        hot: true, // Tell the dev-server we're using HMR
        contentBase: './dist'
    }
    //devtool: 'source-map'
};

