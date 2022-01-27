const path = require('path');

module.exports = {
    mode: "production",
    entry: { 
        game: "./src/public/js/game.js",
        logo: "./src/public/js/logodisplay.js",
        rooms: "./src/public/js/rooms.js"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "./src/public/js/dist"),
  },
};
