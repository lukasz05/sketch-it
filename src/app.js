const http = require("http");
const express = require("express");
const RoomRequestsHandler = require("./rooms/room-requests-handler");
const path = require("path");
const { Server } = require("socket.io");
const RoomService = require("./rooms/room-service");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
});

const io = new Server(server);

// eslint-disable-next-line no-unused-vars
const roomRequestsHandler = new RoomRequestsHandler(io, new RoomService());

server.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
