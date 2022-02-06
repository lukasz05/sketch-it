import { assert } from "chai";
import { createServer } from "http";
import { Server } from "socket.io";
import Client from "socket.io-client";

import eventNames from "../src/rooms/event-names.js";
import RoomRequestsHandler from "../src/rooms/room-requests-handler.js";
import RoomService from "../src/rooms/room-service.js";
import { Room } from "../src/rooms/room.js";

describe("RoomRequestsHandler", function () {
    let io;
    let clientSocket1, clientSocket2, clientSocket3;
    let roomService;
    let socketToUserMap;
    beforeEach(function (done) {
        const httpServer = createServer();
        io = new Server(httpServer);
        socketToUserMap = {};
        roomService = new RoomService();
        // eslint-disable-next-line no-unused-vars
        const roomRequestsHandler = new RoomRequestsHandler(io, socketToUserMap, roomService);

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
        io.close();
        clientSocket1.close();
        clientSocket2.close();
        clientSocket3.close();
    });

    describe("GET_ROOMS_REQUEST", function () {
        function getSampleRooms(count) {
            let sampleRooms = [];
            let prevCreatedAt = null;
            for (let i = 1; i <= count; i++) {
                const room = new Room(`room ${i}`, "owner", {});
                for (let j = 1; j <= 5; j++) {
                    room.addMember(`member ${j}`);
                }
                if (prevCreatedAt) {
                    room.createdAt = prevCreatedAt + 5;
                }
                prevCreatedAt = room.createdAt;
                room.hasGameStarted = false;
                room.currentlyDrawingUser = null;
                room.drawingEndTime = null;
                sampleRooms.push(room);
            }
            return sampleRooms;
        }

        const sampleRooms = getSampleRooms(10);
        const sampleRoomsNewestFirst = sampleRooms.sort((a, b) => b.createdAt - a.createdAt);
        const testData = [
            {
                request: {
                    pageSize: 0,
                    pageIndex: 0,
                },
                expectedResponse: {
                    success: true,
                    data: [],
                },
            },
            {
                request: {
                    pageSize: 1,
                    pageIndex: 0,
                },
                expectedResponse: {
                    success: true,
                    data: [sampleRoomsNewestFirst[0]],
                },
            },
            {
                request: {
                    pageSize: 1,
                    pageIndex: 1,
                },
                expectedResponse: {
                    success: true,
                    data: [sampleRoomsNewestFirst[1]],
                },
            },
            {
                request: {
                    pageSize: 3,
                    pageIndex: 1,
                },
                expectedResponse: {
                    success: true,
                    data: sampleRoomsNewestFirst.slice(3, 6),
                },
            },
            {
                request: {
                    pageSize: 3,
                    pageIndex: 3,
                },
                expectedResponse: {
                    success: true,
                    data: sampleRoomsNewestFirst.slice(-1),
                },
            },
        ];

        testData.forEach(function (test) {
            it(`should return correct result for pageSize = ${test.request.pageSize} and pageIndex = ${test.request.pageIndex}`, function (done) {
                roomService.setRooms(sampleRooms);
                clientSocket1.emit(
                    eventNames.GET_ROOMS_REQUEST,
                    test.request.pageSize,
                    test.request.pageIndex,
                    function (response) {
                        assert.deepEqual(response, test.expectedResponse);
                        done();
                    }
                );
            });
        });
    });

    describe("GET_ROOM_REQUEST", function () {
        it("should return room if it exists", function (done) {
            roomService.createRoom("room", { prop: "value" });
            const expectedRoom = roomService.getRoomByName("room");
            clientSocket1.emit(eventNames.GET_ROOM_REQUEST, expectedRoom.name, function (response) {
                assert.deepEqual(response, { success: true, data: expectedRoom });
                done();
            });
        });

        it("should return null if room does not exist", function (done) {
            clientSocket1.emit(eventNames.GET_ROOM_REQUEST, "room", function (response) {
                assert.deepEqual(response, { success: true, data: null });
                done();
            });
        });
    });

    describe("CREATE_ROOM_REQUEST", function () {
        it("should create a room and notify all clients except the sender", function (done) {
            const roomName = "room";
            const roomSettings = {
                prop1: "val1",
                prop2: "val2",
            };
            clientSocket1.emit(
                eventNames.CREATE_ROOM_REQUEST,
                roomName,
                roomSettings,
                function (response) {
                    assert.deepEqual(response, {
                        success: true,
                    });

                    const expectedRoom = new Room(roomName, roomSettings);
                    const actualRooms = roomService.getAllRooms();
                    assert.lengthOf(actualRooms, 1);
                    assert.strictEqual(actualRooms[0].name, expectedRoom.name);
                    assert.strictEqual(actualRooms[0].owner, expectedRoom.owner);
                    assert.deepEqual(actualRooms[0].score, expectedRoom.score);
                    assert.deepEqual(actualRooms[0].settings, expectedRoom.settings);
                    assert.closeTo(actualRooms[0].createdAt, expectedRoom.createdAt, 1000);

                    clientSocket2.on(eventNames.ROOM_CREATED_NOTIFICATION, function (room) {
                        assert.deepEqual(room, actualRooms[0]);
                        done();
                    });
                    clientSocket1.on(eventNames.ROOM_CREATED_NOTIFICATION, function () {
                        done(Error("The sender received the notification"));
                    });
                }
            );
        });
        it("should return RoomAlreadyExistsError when a room with the same name exists", function (done) {
            const roomName = "room";
            roomService.createRoom(roomName, {});
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function (response) {
                assert.deepEqual(response, {
                    success: false,
                    data: {
                        name: "RoomAlreadyExistsError",
                        message: `Room "${roomName}" already exists.`,
                    },
                });

                done();
            });
        });
        it("should return SocketAlreadyInRoomError when the client is already in some room", function (done) {
            const firstRoomName = "room 1";
            const owner = "owner";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, firstRoomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, owner, firstRoomName, function () {
                    clientSocket1.emit(
                        eventNames.CREATE_ROOM_REQUEST,
                        "room 2",
                        {},
                        function (response) {
                            assert.deepEqual(response, {
                                success: false,
                                data: {
                                    name: "SocketAlreadyInRoomError",
                                    message: `Socket ${clientSocket1.id} is already associated with user "${owner}" in room "${firstRoomName}".`,
                                },
                            });
                            done();
                        }
                    );
                });
            });
        });
    });

    describe("JOIN_ROOM_REQUEST", function () {
        it("should add the sender to the room, return the room in the callback and notify all clients in the room except the sender", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    const memberName = "member";
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function (response) {
                            assert.isTrue(response.success);

                            const expectedRoomMemberNames = [ownerName, memberName];
                            const actualRoom = roomService.getRoomByName(roomName);
                            const returnedRoom = response.data;
                            assert.deepEqual(actualRoom.getMemberNames(), expectedRoomMemberNames);
                            assert.deepEqual(returnedRoom, actualRoom);

                            clientSocket1.on(
                                eventNames.USER_JOINED_ROOM_NOTIFICATION,
                                function (user) {
                                    assert.deepEqual(actualRoom.members[memberName], user);
                                    done();
                                }
                            );
                            clientSocket2.on(eventNames.USER_JOINED_ROOM_NOTIFICATION, function () {
                                done(Error("The sender received the notification"));
                            });
                            clientSocket3.on(eventNames.USER_JOINED_ROOM_NOTIFICATION, function () {
                                done(Error("Client outside the room received the notification"));
                            });
                        }
                    );
                });
            });
        });
        it("should return UserAlreadyInRoomError when there is a user with the same username in the room", function (done) {
            const roomName = "room";
            const username = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, username, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        username,
                        roomName,
                        function (response) {
                            assert.deepEqual(response, {
                                success: false,
                                data: {
                                    name: "UserAlreadyInRoomError",
                                    message: `User "${username}" is already a member of the room "${roomName}".`,
                                },
                            });

                            done();
                        }
                    );
                });
            });
        });
        it("should return RoomAlreadyFullError when room is already full", function (done) {
            const roomName = "room";
            clientSocket1.emit(
                eventNames.CREATE_ROOM_REQUEST,
                roomName,
                { maxMembersCount: 1 },
                function () {
                    clientSocket1.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        "owner",
                        roomName,
                        function () {
                            clientSocket2.emit(
                                eventNames.JOIN_ROOM_REQUEST,
                                "member",
                                roomName,
                                function (response) {
                                    assert.deepEqual(response, {
                                        success: false,
                                        data: {
                                            name: "RoomAlreadyFullError",
                                            message: `Room "${roomName}" is already full.`,
                                        },
                                    });

                                    done();
                                }
                            );
                        }
                    );
                }
            );
        });
        it("should return SocketAlreadyInRoomError when the client is already in some room", function (done) {
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, "room 1", {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, "owner", "room 1", function () {
                    clientSocket2.emit(eventNames.CREATE_ROOM_REQUEST, "room 2", {}, function () {
                        clientSocket1.emit(
                            eventNames.JOIN_ROOM_REQUEST,
                            "member",
                            "room 2",
                            function (response) {
                                assert.deepEqual(response, {
                                    success: false,
                                    data: {
                                        name: "SocketAlreadyInRoomError",
                                        message: `Socket ${clientSocket1.id} is already associated with user "owner" in room "room 1".`,
                                    },
                                });

                                done();
                            }
                        );
                    });
                });
            });
        });
    });

    describe("LEAVE_ROOM_REQUEST", function () {
        it("should remove the sender from the room and notify all clients in the room except the sender", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket2.emit(eventNames.LEAVE_ROOM_REQUEST, function (response) {
                                assert.deepEqual(response, { success: true });

                                const expectedRoomMemberNames = [ownerName];
                                const actualRoom = roomService.getRoomByName(roomName);
                                assert.deepEqual(
                                    actualRoom.getMemberNames(),
                                    expectedRoomMemberNames
                                );

                                clientSocket1.on(
                                    eventNames.USER_LEFT_ROOM_NOTIFICATION,
                                    function (username) {
                                        assert.equal(username, memberName);
                                        done();
                                    }
                                );
                                clientSocket2.on(
                                    eventNames.USER_LEFT_ROOM_NOTIFICATION,
                                    function () {
                                        done(Error("The sender received the notification"));
                                    }
                                );
                                clientSocket3.on(
                                    eventNames.USER_LEFT_ROOM_NOTIFICATION,
                                    function () {
                                        done(
                                            Error(
                                                "Client outside the room received the notification"
                                            )
                                        );
                                    }
                                );
                            });
                        }
                    );
                });
            });
        });
        it("should remove the room when the sender is the last member", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket1.emit(eventNames.LEAVE_ROOM_REQUEST, function (response) {
                        assert.deepEqual(response, { success: true });
                        assert.isEmpty(roomService.getAllRooms());

                        done();
                    });
                });
            });
        });
        it("should pick a new owner and notify all clients in the room when the sender is the owner", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket1.emit(eventNames.LEAVE_ROOM_REQUEST, function () {
                                const room = roomService.getRoomByName(roomName);
                                assert.equal(room.owner, memberName);
                                clientSocket2.on(
                                    eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                    function (username) {
                                        assert.equal(username, memberName);
                                        done();
                                    }
                                );
                                clientSocket1.on(
                                    eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                    function () {
                                        done(Error("The sender received the notification"));
                                    }
                                );
                            });
                        }
                    );
                });
            });
        });
        it("should return SocketNotInRoomError when the sender does not belong to any room", function (done) {
            clientSocket1.emit(eventNames.LEAVE_ROOM_REQUEST, function (response) {
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
    describe("KICK_USER_FROM_ROOM_REQUEST", function () {
        it("should remove the user from the room and notify all clients in the room except the sender", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const kickedMemberName = "member 1";
            const otherMemberNAme = "member 2";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        kickedMemberName,
                        roomName,
                        function () {
                            clientSocket3.emit(
                                eventNames.JOIN_ROOM_REQUEST,
                                otherMemberNAme,
                                roomName,
                                function () {
                                    clientSocket1.emit(
                                        eventNames.KICK_USER_FROM_ROOM_REQUEST,
                                        kickedMemberName,
                                        function (response) {
                                            assert.deepEqual(response, { success: true });
                                            const expectedRoomMemberNames = [
                                                ownerName,
                                                otherMemberNAme,
                                            ];
                                            const room = roomService.getRoomByName(roomName);
                                            assert.deepEqual(
                                                room.getMemberNames(),
                                                expectedRoomMemberNames
                                            );

                                            clientSocket3.on(
                                                eventNames.USER_KICKED_FROM_ROOM_NOTIFICATION,
                                                function (username) {
                                                    assert.equal(username, kickedMemberName);
                                                    done();
                                                }
                                            );
                                            clientSocket2.on(
                                                eventNames.USER_KICKED_FROM_ROOM_NOTIFICATION,
                                                function () {
                                                    done(
                                                        Error(
                                                            "The kicked client received the notification"
                                                        )
                                                    );
                                                }
                                            );
                                            clientSocket1.on(
                                                eventNames.USER_KICKED_FROM_ROOM_NOTIFICATION,
                                                function () {
                                                    done(
                                                        Error(
                                                            "The sender received the notification"
                                                        )
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            });
        });
        it("should return UserNotPermittedError when the sender is not an owner", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket2.emit(
                                eventNames.KICK_USER_FROM_ROOM_REQUEST,
                                ownerName,
                                function (response) {
                                    assert.deepEqual(response, {
                                        success: false,
                                        data: {
                                            name: "UserNotPermittedError",
                                            message: `User "${memberName}" is not an owner of room "${roomName}".`,
                                        },
                                    });
                                    done();
                                }
                            );
                        }
                    );
                });
            });
        });
        it("should return UserNotInRoomError when the target is not in the room", function (done) {
            const roomName = "room";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, "owner", roomName, function () {
                    clientSocket1.emit(
                        eventNames.KICK_USER_FROM_ROOM_REQUEST,
                        "member",
                        function (response) {
                            assert.deepEqual(response, {
                                success: false,
                                data: {
                                    name: "UserNotInRoomError",
                                    message: `User "member" is not a member of the room "${roomName}".`,
                                },
                            });
                            done();
                        }
                    );
                });
            });
        });
        it("should return IllegalOperationError when the sender and the target are equal", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket1.emit(
                        eventNames.KICK_USER_FROM_ROOM_REQUEST,
                        ownerName,
                        function (response) {
                            assert.deepEqual(response, {
                                success: false,
                                data: {
                                    name: "IllegalOperationError",
                                    message: "The owner cannot kick itself from the room",
                                },
                            });
                            done();
                        }
                    );
                });
            });
        });
        it("should return SocketNotInRoomError when the sender does not belong to any room", function (done) {
            clientSocket1.emit(
                eventNames.KICK_USER_FROM_ROOM_REQUEST,
                "member",
                function (response) {
                    assert.deepEqual(response, {
                        success: false,
                        data: {
                            name: "SocketNotInRoomError",
                            message: `Socket "${clientSocket1.id}" does not belong to any room.`,
                        },
                    });
                    done();
                }
            );
        });
    });

    describe("CHANGE_ROOM_OWNER", function () {
        it("should change the room owner and notify all clients in the room except the sender", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket1.emit(
                                eventNames.CHANGE_ROOM_OWNER_REQUEST,
                                memberName,
                                function (response) {
                                    assert.deepEqual(response, {
                                        success: true,
                                    });

                                    const actualNewOwner =
                                        roomService.getRoomByName(roomName).owner;
                                    assert.deepEqual(actualNewOwner, memberName);

                                    clientSocket2.on(
                                        eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                        function (newOwner) {
                                            assert.deepEqual(newOwner, memberName);
                                            done();
                                        }
                                    );
                                    clientSocket1.on(
                                        eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                        function () {
                                            done(Error("The sender received the notification"));
                                        }
                                    );
                                    clientSocket3.on(
                                        eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                        function () {
                                            done(
                                                Error(
                                                    "Client outside the room received the notification"
                                                )
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            });
        });
        it("should return UserNotPermittedError when the sender is not an owner", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket2.emit(
                                eventNames.CHANGE_ROOM_OWNER_REQUEST,
                                memberName,
                                function (response) {
                                    assert.deepEqual(response, {
                                        success: false,
                                        data: {
                                            name: "UserNotPermittedError",
                                            message: `User "${memberName}" is not an owner of room "${roomName}".`,
                                        },
                                    });
                                    done();
                                }
                            );
                        }
                    );
                });
            });
        });
        it("should return UserNotInRoomError when the new owner is not in the room", function (done) {
            const roomName = "room";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, "owner", roomName, function () {
                    clientSocket1.emit(
                        eventNames.CHANGE_ROOM_OWNER_REQUEST,
                        "member",
                        function (response) {
                            assert.deepEqual(response, {
                                success: false,
                                data: {
                                    name: "UserNotInRoomError",
                                    message: `User "member" is not a member of the room "${roomName}".`,
                                },
                            });
                            done();
                        }
                    );
                });
            });
        });
        it("should return SocketNotInRoomError when the sender does not belong to any room", function (done) {
            clientSocket1.emit(eventNames.CHANGE_ROOM_OWNER_REQUEST, "owner", function (response) {
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

    describe("UPDATE_ROOM_SETTINGS_REQUEST", function () {
        it("should update room settings and notify all clients in the room except the sender", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(
                eventNames.CREATE_ROOM_REQUEST,
                roomName,
                { prop1: "val1", prop2: "val2" },
                function () {
                    clientSocket1.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        ownerName,
                        roomName,
                        function () {
                            clientSocket2.emit(
                                eventNames.JOIN_ROOM_REQUEST,
                                memberName,
                                roomName,
                                function () {
                                    const updatedSettings = {
                                        prop1: "val1 modified",
                                        prop2: "val2 modified",
                                        prop3: "val3",
                                    };
                                    clientSocket1.emit(
                                        eventNames.UPDATE_ROOM_SETTINGS_REQUEST,
                                        updatedSettings,
                                        function (response) {
                                            assert.deepEqual(response, {
                                                success: true,
                                            });

                                            const actualSettings =
                                                roomService.getRoomByName(roomName).settings;
                                            assert.deepEqual(actualSettings, updatedSettings);

                                            clientSocket2.on(
                                                eventNames.ROOM_SETTINGS_UPDATED_NOTIFICATION,
                                                function (settings) {
                                                    assert.deepEqual(settings, actualSettings);
                                                    done();
                                                }
                                            );
                                            clientSocket1.on(
                                                eventNames.ROOM_SETTINGS_UPDATED_NOTIFICATION,
                                                function () {
                                                    done(
                                                        Error(
                                                            "The sender received the notification"
                                                        )
                                                    );
                                                }
                                            );
                                            clientSocket3.on(
                                                eventNames.ROOM_SETTINGS_UPDATED_NOTIFICATION,
                                                function () {
                                                    done(
                                                        Error(
                                                            "Client outside the room received the notification"
                                                        )
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
        it("should return UserNotPermittedError when the sender is not an owner", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket2.emit(
                                eventNames.UPDATE_ROOM_SETTINGS_REQUEST,
                                {},
                                function (response) {
                                    assert.deepEqual(response, {
                                        success: false,
                                        data: {
                                            name: "UserNotPermittedError",
                                            message: `User "${memberName}" is not an owner of room "${roomName}".`,
                                        },
                                    });
                                    done();
                                }
                            );
                        }
                    );
                });
            });
        });
        it("should return SocketNotInRoomError when the sender does not belong to any room", function (done) {
            clientSocket1.emit(eventNames.UPDATE_ROOM_SETTINGS_REQUEST, {}, function (response) {
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

    describe("client disconnected", function () {
        it("should remove the disonnected client from the room and notify all clients in the room", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket2.close();

                            clientSocket1.on(
                                eventNames.USER_LEFT_ROOM_NOTIFICATION,
                                function (username) {
                                    assert.equal(username, memberName);

                                    const room = roomService.getRoomByName(roomName);
                                    assert.deepEqual(room.getMemberNames(), [ownerName]);

                                    done();
                                }
                            );
                            clientSocket3.on(eventNames.USER_LEFT_ROOM_NOTIFICATION, function () {
                                done(Error("Client outside the room received the notification"));
                            });
                        }
                    );
                });
            });
        });
        it("should remove the room when the disconnected client is the last member", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket1.close();
                    setTimeout(function () {
                        assert.isEmpty(roomService.getAllRooms());

                        done();
                    }, 50);
                });
            });
        });
        it("should pick a new owner and notify all clients in the room when the disconnected client is the owner", function (done) {
            const roomName = "room";
            const ownerName = "owner";
            const memberName = "member";
            clientSocket1.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, function () {
                clientSocket1.emit(eventNames.JOIN_ROOM_REQUEST, ownerName, roomName, function () {
                    clientSocket2.emit(
                        eventNames.JOIN_ROOM_REQUEST,
                        memberName,
                        roomName,
                        function () {
                            clientSocket1.close();
                            clientSocket2.on(
                                eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                function (username) {
                                    assert.equal(username, memberName);

                                    const room = roomService.getRoomByName(roomName);
                                    assert.equal(room.owner, memberName);

                                    done();
                                }
                            );
                            clientSocket3.on(
                                eventNames.ROOM_OWNER_CHANGED_NOTIFICATION,
                                function () {
                                    done(
                                        Error("Client outside the room received the notification")
                                    );
                                }
                            );
                        }
                    );
                });
            });
        });
    });
});
