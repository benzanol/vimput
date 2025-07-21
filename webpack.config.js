const path = require("path");

module.exports = {
    mode: "development", // or "production"
    entry: {
        background: "./src/background.ts",
        content: "./src/content.ts",
        popup: "./src/popup.ts",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    // Optional: generate source maps
    devtool: "source-map",
};
