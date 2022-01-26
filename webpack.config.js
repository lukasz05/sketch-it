const path = require('path');

module.exports = {
    mode: "production",
    entry: "./src/public/js/game.js",
    output: {
        filename: "game.js",
        path: path.resolve(__dirname, "./src/public/js/dist"),
  },
};
