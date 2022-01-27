import { createServer } from "http";
import express from "express";
import { renderFile } from "ejs";
import RoomRequestsHandler from "./rooms/room-requests-handler.js";
import { join, dirname } from "path";
import { Server } from "socket.io";
import RoomService from "./rooms/room-service.js";
import { fileURLToPath } from "url";

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.set("views", join(__dirname, "views"));
app.set("view engine", "html");
app.engine("html", renderFile);
app.use(express.static(join(__dirname, "public")));

const server = createServer(app);

/* GET endpoints (for browsers) */

app.get("/", (req, res) => {
    res.render("main.html");
});

app.get("/rooms", (req, res) => {
    res.render("rooms.html");
});

app.get("/rooms/:roomName", (req, res) => {
    res.render("game.html");
});

const io = new Server(server);

// eslint-disable-next-line no-unused-vars
const roomRequestsHandler = new RoomRequestsHandler(io, new RoomService());

server.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
