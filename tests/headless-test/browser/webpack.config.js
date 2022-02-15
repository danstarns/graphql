const path = require("path");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
    entry: "./test.js",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [new NodePolyfillPlugin()],
    resolve: {
        extensions: [".js", ".jsx", ".json", ".ts", ".tsx"], // other stuff
    },
};
