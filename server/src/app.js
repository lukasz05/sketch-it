import { createServer } from "http";
import express from "express";
import { renderFile } from "ejs";
import RoomRequestsHandler from "./rooms/room-requests-handler.js";
import { join, dirname } from "path";
import { Server } from "socket.io";
import RoomService from "./rooms/room-service.js";
import { fileURLToPath } from "url";
import GameStateRequestsHandler from "./game-state/game-state-requests-handler.js";
import WordProvider from "./game-state/word-provider.js";

const PORT = process.env.PORT || 7777;
const HOST = process.env.HOST || "0.0.0.0";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.set("views", join(__dirname, "views"));
app.set("view engine", "html");
app.engine("html", renderFile);
app.use(express.static(join(__dirname, "public")));

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:8080",
    },
});

const socketToUserMap = {};
const roomService = new RoomService();
const wordProvider = new WordProvider(join(__dirname, "./game-state/words.json"));
// eslint-disable-next-line no-unused-vars
const roomRequestsHandler = new RoomRequestsHandler(io, socketToUserMap, roomService);
// eslint-disable-next-line no-unused-vars
const gameStateRequestsHandler = new GameStateRequestsHandler(
    io,
    socketToUserMap,
    roomService,
    wordProvider
);

server.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
