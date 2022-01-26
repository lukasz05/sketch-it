const http = require("http");
const express = require("express");
const ejs = require('ejs');
const RoomRequestsHandler = require("./rooms/room-requests-handler");
const path = require("path");
const { Server } = require("socket.io");
const RoomService = require("./rooms/room-service");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

app.set('views', './views');
app.set('view engine', 'html');
app.engine('html', ejs.renderFile );
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

/* GET endpoints (for browsers) */
app.get("/", (req, res) => {
    res.render('main.html');
});

const io = new Server(server);

// eslint-disable-next-line no-unused-vars
const roomRequestsHandler = new RoomRequestsHandler(io, new RoomService());

server.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
