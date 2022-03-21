import { assert } from "chai";
import { createServer } from "http";
import { Server } from "socket.io";
import Client from "socket.io-client";
import { DRAWING_TIME_LIMIT_IN_SECONDS } from "../src/game-state/drawing-scheduler.js";
import GameStateRequestsHandler from "../src/game-state/game-state-requests-handler.js";

import eventNames from "../../common/event-names.mjs";
import RoomRequestsHandler from "../src/rooms/room-requests-handler.js";
import RoomService from "../src/rooms/room-service.js";

describe("GameStateRequestsHandler", function () {
    let io;
    let clientSocket1, clientSocket2, clientSocket3;
    let roomService;
    let socketToUserMap;
    const expectedWord = "expectedWord";
    beforeEach(function (done) {
        const httpServer = createServer();
        io = new Server(httpServer);
        socketToUserMap = {};
        roomService = new RoomService();
        // eslint-disable-next-line no-unused-vars
        const roomRequestsHandler = new RoomRequestsHandler(io, socketToUserMap, roomService);
        // eslint-disable-next-line no-unused-vars
        const gameStateRequestsHandler = new GameStateRequestsHandler(
            io,
            socketToUserMap,
            roomService,
            { getRandomWord: () => expectedWord }
        );
        //
        httpServer.listen(function () {
            const port = httpServer.address().port;
            clientSocket1 = new Client(`http://localhost:${port}`);
            clientSocket1.on("connect", function () {
                clientSocket2 = new Client(`http://localhost:${port}`);
                clientSocket2.on("connect", function () {
                    clientSocket3 = new Client(`http://localhost:${port}`);
                    clientSocket3.on("connect", done);
                });
            });
        });
    });

    afterEach(function () {
        clientSocket1.close();
        clientSocket2.close();
        clientSocket3.close();
        io.close();
    });

    function prepareRoomWithTwoMembers(roomName, memberNames, callback) {
        clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
            clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, memberNames[0], roomName, function () {
                clientSocket2.emit(
                    eventNames.JOIN_ROOM_REQUEST,
                    memberNames[1],
                    roomName,
                    callback
                );
            });
        });
    }

    function prepareRoomWithThreeMembers(roomName, memberNames, callback) {
        prepareRoomWithTwoMembers(roomName, memberNames.slice(0, 2), function () {
            clientSocket3.emit(eventNames.JOIN_ROOM_REQUEST, memberNames[2], roomName, callback);
        });
    }

    describe("START_GAME_REQUEST", function () {
        it("should start the game, set a currently drawing user and drawing end time", function (done) {
            const roomName = "room";
            const owner = "owner";
            prepareRoomWithThreeMembers(roomName, [owner, "member1", "member2"], function () {
                clientSocket1.emit(eventNames.START_GAME_REQUEST, function (response) {
                    assert.deepEqual(response, { success: true });
                    const room = roomService.getRoomByName(roomName);
                    assert.isTrue(room.hasGameStarted);
                    assert.equal(room.currentlyDrawingUser, owner);
                    assert.isNotNull(room.drawingEndTime);
                    done();
                });
            });
        });
        it("should send GAME_STARTED_NOTIFICATION to all clients in the room except the sender", function (done) {
            const roomName = "room";
            prepareRoomWithTwoMembers(roomName, ["owner", "member1"], function () {
                clientSocket2.on(eventNames.GAME_STARTED_NOTIFICATION, function () {
                    done();
                });
                clientSocket1.on(eventNames.GAME_STARTED_NOTIFICATION, function () {
                    done(Error("The sender received the notification"));
                });
                clientSocket3.on(eventNames.GAME_STARTED_NOTIFICATION, function () {
                    done(Error("Client outside the room received the notification"));
                });
                clientSocket1.emit(eventNames.START_GAME_REQUEST, function (response) {
                    assert.deepEqual(response, { success: true });
                });
            });
        });
        it("should send DRAWING_USER_CHANGED_NOTIFICATION to all clients in the room", function (done) {
            const roomName = "room";
            const owner = "owner";
            prepareRoomWithTwoMembers(roomName, [owner, "member1"], function () {
                let notifiedClientsCount = 0;
                function checkNotifiedClientsCount() {
                    if (notifiedClientsCount == 2) {
                        done();
                    }
                }
                clientSocket1.on(
                    eventNames.DRAWING_USER_CHANGED_NOTIFICATION,
                    function (previouslyDrawingUser, currentlyDrawingUser, drawingEndTime) {
                        assert.isNull(previouslyDrawingUser);
                        assert.equal(currentlyDrawingUser, owner);
                        assert.closeTo(
                            drawingEndTime,
                            Date.now() + DRAWING_TIME_LIMIT_IN_SECONDS * 1000,
                            1000
                        );
                        notifiedClientsCount++;
                        checkNotifiedClientsCount();
                    }
                );
                clientSocket2.on(eventNames.DRAWING_USER_CHANGED_NOTIFICATION, function () {
                    notifiedClientsCount++;
                    checkNotifiedClientsCount();
                });
                clientSocket3.on(eventNames.DRAWING_USER_CHANGED_NOTIFICATION, function () {
                    done(Error("Client outside the room received the notification"));
                });
                clientSocket1.emit(eventNames.START_GAME_REQUEST, function (response) {
                    assert.deepEqual(response, { success: true });
                });
            });
        });
        it("should return UserNotPermittedError when the sender is not an owner", function (done) {
            const roomName = "room";
            const memberName = "member1";
            prepareRoomWithTwoMembers(roomName, ["owner", memberName], function () {
                clientSocket2.emit(eventNames.START_GAME_REQUEST, function (response) {
                    assert.deepEqual(response, {
                        success: false,
                        data: {
                            name: "UserNotPermittedError",
                            message: `User "${memberName}" is not an owner of room "${roomName}".`,
                        },
                    });
                    done();
                });
            });
        });
        it("should return GameAlreadyStartedError when the game has already started", function (done) {
            const roomName = "room";
            const memberName = "member1";
            prepareRoomWithTwoMembers(roomName, ["owner", memberName], function () {
                clientSocket1.emit(eventNames.START_GAME_REQUEST, function () {
                    clientSocket1.emit(eventNames.START_GAME_REQUEST, function (response) {
                        assert.deepEqual(response, {
                            success: false,
                            data: {
                                name: "GameAlreadyStartedError",
                                message: `Game in room "${roomName}" has already started.`,
                            },
                        });
                        done();
                    });
                });
            });
        });
        it("should return SocketNotInRoomError when the sender does not belong to any room", function (done) {
            clientSocket1.emit(eventNames.START_GAME_REQUEST, function (response) {
                assert.deepEqual(response, {
                    success: false,
                    data: {
                        name: "SocketNotInRoomError",
                        message: `Socket "${clientSocket1.id}" does not belong to any room.`,
                    },
                });
                done();
            });
        });
    });

    describe("GUESS_WORD_REQUEST", function () {
        [true, false].forEach((success) =>
            it(`should sent USER_TRIED_TO_GUESS_NOTIFICATION to all senders in the room (success = ${success})`, function (done) {
                const roomName = "room";
                const owner = "owner";
                const memberName = "member1";
                const sentWord = success ? expectedWord : "unexpectedWord";
                prepareRoomWithTwoMembers(roomName, [owner, memberName], function () {
                    clientSocket1.emit(eventNames.START_GAME_REQUEST, function () {
                        let notifiedClientsCount = 0;
                        function checkNotifiedClientsCount() {
                            if (notifiedClientsCount == 2) {
                                done();
                            }
                        }
                        clientSocket1.on(
                            eventNames.USER_TRIED_TO_GUESS_WORD_NOTIFICATION,
                            function (username, word, actualSuccess) {
                                assert.equal(username, memberName);
                                assert.equal(word, sentWord);
                                assert.equal(actualSuccess, success);
                                notifiedClientsCount++;
                                checkNotifiedClientsCount();
                            }
                        );
                        clientSocket2.on(
                            eventNames.USER_TRIED_TO_GUESS_WORD_NOTIFICATION,
                            function () {
                                notifiedClientsCount++;
                                checkNotifiedClientsCount();
                            }
                        );
                        clientSocket3.on(
                            eventNames.USER_TRIED_TO_GUESS_WORD_NOTIFICATION,
                            function () {
                                done(Error("Client outside the room received the notification"));
                            }
                        );
                        clientSocket2.emit(
                            eventNames.GUESS_WORD_REQUEST,
                            sentWord,
                            function (response) {
                                assert.deepEqual(response, {
                                    success: true,
                                });
                            }
                        );
                    });
                });
            })
        );
        it("should change currently drawing user and send DRAWING_USER_CHANGED_NOTIFICATION when guess was successful", function (done) {
            const roomName = "room";
            const owner = "owner";
            const memberName = "member1";
            prepareRoomWithTwoMembers(roomName, [owner, memberName], function () {
                clientSocket1.emit(eventNames.START_GAME_REQUEST, function () {
                    let notifiedClientsCount = 0;
                    function checkNotifiedClientsCount() {
                        if (notifiedClientsCount == 2) {
                            done();
                        }
                    }
                    clientSocket1.on(
                        eventNames.DRAWING_USER_CHANGED_NOTIFICATION,
                        function (previouslyDrawingUser, currentlyDrawingUser, drawingEndTime) {
                            assert.equal(previouslyDrawingUser, owner);
                            assert.equal(currentlyDrawingUser, memberName);
                            assert.closeTo(
                                drawingEndTime,
                                Date.now() + DRAWING_TIME_LIMIT_IN_SECONDS * 1000,
                                1000
                            );
                            notifiedClientsCount++;
                            checkNotifiedClientsCount();
                        }
                    );
                    clientSocket2.on(eventNames.DRAWING_USER_CHANGED_NOTIFICATION, function () {
                        notifiedClientsCount++;
                        checkNotifiedClientsCount();
                    });
                    clientSocket3.on(eventNames.DRAWING_USER_CHANGED_NOTIFICATION, function () {
                        done(Error("Client outside the room received the notification"));
                    });
                    clientSocket2.emit(
                        eventNames.GUESS_WORD_REQUEST,
                        expectedWord,
                        function (response) {
                            assert.deepEqual(response, {
                                success: true,
                            });
                            const room = roomService.getRoomByName(roomName);
                            assert.equal(room.currentlyDrawingUser, memberName);
                            assert.closeTo(
                                room.drawingEndTime,
                                Date.now() + DRAWING_TIME_LIMIT_IN_SECONDS * 1000,
                                1000
                            );
                        }
                    );
                });
            });
        });
        it("should return UserNotPermittedError when the sender is the currently drawing user", function (done) {
            const roomName = "room";
            const owner = "owner";
            prepareRoomWithTwoMembers(roomName, [owner, "member1"], function () {
                clientSocket1.emit(eventNames.START_GAME_REQUEST, function () {
                    clientSocket1.emit(eventNames.GUESS_WORD_REQUEST, "word", function (response) {
                        assert.deepEqual(response, {
                            success: false,
                            data: {
                                name: "UserNotPermittedError",
                                message: `User "${owner}" is currently drawing in room "${roomName}" and is not permitted to guess.`,
                            },
                        });
                        done();
                    });
                });
            });
        });
        it("should return GameNotStartedError when the game has not started yet", function (done) {
            const roomName = "room";
            prepareRoomWithTwoMembers(roomName, ["owner", "member1"], function () {
                clientSocket1.emit(eventNames.GUESS_WORD_REQUEST, "word", function (response) {
                    assert.deepEqual(response, {
                        success: false,
                        data: {
                            name: "GameNotStartedError",
                            message: `Game in room "${roomName}" has not started yet.`,
                        },
                    });
                    done();
                });
            });
        });
        it("should return SocketNotInRoomError when the sender does not belong to any room", function (done) {
            clientSocket1.emit(eventNames.START_GAME_REQUEST, function (response) {
                assert.deepEqual(response, {
                    success: false,
                    data: {
                        name: "SocketNotInRoomError",
                        message: `Socket "${clientSocket1.id}" does not belong to any room.`,
                    },
                });
                done();
            });
        });
    });
});
