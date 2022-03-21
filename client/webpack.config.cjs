const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const { webpack, EnvironmentPlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

const smp = new SpeedMeasurePlugin();

const config = {
    mode: "production",
    entry: {
        game: "./src/game.js",
        logo: "./src/logodisplay.js",
        rooms: "./src/rooms.js",
    },
    output: {
        filename: "js/[name].js",
        path: path.resolve(__dirname, "./dist"),
    },
    optimization: {
        splitChunks: {
            chunks: "all",
        },
    },
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: true,
                        },
                    },
                ],
            },
        ],
    },
    devServer: {
        hot: true,
        static: {
            directory: path.join(__dirname, "dist"),
        },
        client: {
            overlay: {
                errors: true,
                warnings: false,
            },
        },
        watchFiles: ["src/**/*.js", "src/**/*.html", "src/**/*.scss"],
        compress: true,
        port: 8080,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/views/game.html",
            filename: "game.html",
            chunks: ["game"],
        }),
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "src/views/index.html",
            chunks: ["logo"],
        }),
        new HtmlWebpackPlugin({
            filename: "rooms.html",
            template: "src/views/rooms.html",
            chunks: ["rooms"],
        }),
        new CopyPlugin({
            patterns: [{ from: "fonts/", to: "fonts/" }],
        }),
        new EnvironmentPlugin({
            NODE_ENV: "development",
            SERVER_URL: "http://localhost:7777",
        }),
    ],
};

const configWithTimeMeasurement = smp.wrap(config);
configWithTimeMeasurement.plugins.push(
    new MiniCssExtractPlugin({
        filename: "css/style.css",
    })
);

module.exports = configWithTimeMeasurement;
