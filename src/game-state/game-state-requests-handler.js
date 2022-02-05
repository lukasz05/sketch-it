import eventNames from "../rooms/event-names.js";
import { DomainError, SocketNotInRoomError, UserNotPermittedError } from "../common/utils.js";
import { DrawingScheduler } from "./drawing-scheduler.js";
import GuessingService from "./guessing-service.js";

class GameStateRequestsHandler {
    #io;
    #socketToUserMap;
    #roomService;
    #drawingSchedulers;
    #guessingServices;
    #wordProvider;
    constructor(io, socketToUserMap, roomService, wordProvider) {
        this.#io = io;
        this.#socketToUserMap = socketToUserMap;
        this.#roomService = roomService;
        this.#drawingSchedulers = {};
        this.#guessingServices = {};
        this.#wordProvider = wordProvider;
        this.#initializeEventListeners();
    }

    #initializeEventListeners() {
        this.#roomService.addRemoveRoomListener((roomName) => {
            const drawingScheduler = this.#drawingSchedulers[roomName];
            if (drawingScheduler) {
                drawingScheduler.stop();
                delete this.#drawingSchedulers[roomName];
            }
            if (this.#guessingServices[roomName]) {
                delete this.#guessingServices[roomName];
            }
        });
        this.#io.on("connection", (socket) => {
            socket.on(eventNames.START_GAME_REQUEST, (callback) =>
                this.#handleStartGameRequest(socket, callback)
            );
            socket.on(eventNames.GUESS_WORD_REQUEST, (word, callback) =>
                this.#handleGuessWordRequest(socket, callback, word)
            );
            socket.on(eventNames.DRAWING_START_NEW_SHAPE, (coordPack, drawingTool, callback) => 
                this.#handleDrawingStartRequest(socket, callback, coordPack, drawingTool)
            );
            socket.on(eventNames.DRAWING_COORDS, (coordPack, callback) => 
                this.#handleDrawingCoordsRequest(socket, callback, coordPack)
            );
        });
    }

    #handleStartGameRequest(socket, callback) {
        try {
            this.#assertSocketInRoom(socket);
            const username = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            this.#assertUserIsOwner(username, room);
            if (room.hasGameStarted) {
                throw new GameAlreadyStartedError(
                    `Game in room "${room.name}" has already started.`
                );
            }

            const drawingScheduler = new DrawingScheduler(room.getMemberNames());
            drawingScheduler.addDrawingUserChangedListener(
                (previouslyDrawingUser, currentlyDrawingUser, drawingEndTime) => {
                    room.clearDrawing();
                    this.#io
                        .in(room.name)
                        .emit(
                            eventNames.DRAWING_USER_CHANGED_NOTIFICATION,
                            previouslyDrawingUser,
                            currentlyDrawingUser,
                            drawingEndTime
                        );
                }
            );
            const guessingService = new GuessingService(this.#wordProvider);
            guessingService.addGuessListener((username, word, success) =>
                this.#io
                    .in(room.name)
                    .emit(eventNames.USER_TRIED_TO_GUESS_WORD_NOTIFICATION, username, word, success)
            );
            room.setDrawingScheduler(drawingScheduler);
            room.setGuessingService(guessingService);
            this.#drawingSchedulers[room.name] = drawingScheduler;
            this.#guessingServices[room.name] = guessingService;

            drawingScheduler.start();

            room.hasGameStarted = true;

            callback({
                success: true,
            });

            socket.to(room.name).emit(eventNames.GAME_STARTED_NOTIFICATION);
        } catch (err) {
            callback({
                success: false,
                data: err,
            });
        }
    }

    #handleGuessWordRequest(socket, callback, word) {
        try {
            this.#assertSocketInRoom(socket);
            const username = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            if (username == room.currentlyDrawingUser) {
                throw new UserNotPermittedError(
                    `User "${username}" is currently drawing in room "${room.name}" and is not permitted to guess.`
                );
            }
            if (!room.hasGameStarted) {
                throw new GameNotStartedError(`Game in room "${room.name}" has not started yet.`);
            }

            const successfulGuess = this.#guessingServices[room.name].guess(username, word);
            if (successfulGuess) {
                this.#drawingSchedulers[room.name].scheduleNextUser();
            }

            callback({ success: true });
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleDrawingStartRequest(socket, callback, coordPack, drawingTool) {
        try {
            this.#assertSocketInRoom(socket);
            const username = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            if (username != room.currentlyDrawingUser) {
                throw new UserNotPermittedError(
                    `User "${username}" is currently drawing and is not permitted to draw.`
                );
            }
            if (!room.hasGameStarted) {
                throw new GameNotStartedError(`Game in room "${room.name}" has not started yet.`);
            }
            room.startShape(coordPack, drawingTool);
            socket.to(room.name).emit(eventNames.DRAWING_START_NEW_SHAPE,
                                      coordPack, drawingTool);
            callback({ success: true });
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleDrawingCoordsRequest(socket, callback, coordPack) {
        try {
            this.#assertSocketInRoom(socket);
            const username = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            if (username != room.currentlyDrawingUser) {
                throw new UserNotPermittedError(
                    `User "${username}" is currently drawing and is not permitted to draw.`
                );
            }
            if (!room.hasGameStarted) {
                throw new GameNotStartedError(`Game in room "${room.name}" has not started yet.`);
            }
            room.pushCoordPack(coordPack);
            socket.to(room.name).emit(eventNames.DRAWING_COORDS, coordPack);
            callback({ success: true });
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #isSocketInRoom(socket) {
        return socket.rooms.size == 2;
    }

    #getRoomBySocket(socket) {
        const roomName = [...socket.rooms].filter((r) => r != socket.id)[0];
        return this.#roomService.getRoomByName(roomName);
    }

    #assertSocketInRoom(socket) {
        if (!this.#isSocketInRoom(socket)) {
            throw new SocketNotInRoomError(`Socket "${socket.id}" does not belong to any room.`);
        }
    }

    #assertUserIsOwner(username, room) {
        if (room.owner != username) {
            throw new UserNotPermittedError(
                `User "${username}" is not an owner of room "${room.name}".`
            );
        }
    }
}

class GameAlreadyStartedError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class GameNotStartedError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export default GameStateRequestsHandler;
