import eventNames from "../../../common/event-names.mjs";
import {
    DomainError,
    SocketNotInRoomError,
    UserNotPermittedError,
    IllegalOperationError,
    RoomNotFoundError,
} from "../../../common/utils.mjs";
import {
    getRoomsRequestSchema,
    getRoomRequestSchema,
    createRoomRequestSchema,
    joinRoomRequestSchema,
    leaveRoomRequestSchema,
    kickUserFromRoomRequestSchema,
    changeRoomOwnerRequestSchema,
    updateRoomSettingsRequestSchema,
} from "./requests-schemas.js";

class RoomRequestsHandler {
    #io;
    #roomService;
    #socketToUserMap;
    constructor(io, socketToUserMap, roomService) {
        this.#io = io;
        this.#socketToUserMap = socketToUserMap;
        this.#roomService = roomService;

        this.#initializeEventListeners();
    }

    #initializeEventListeners() {
        this.#io.on("connection", (socket) => {
            socket.on(eventNames.GET_ROOMS_REQUEST, (pageSize, pageIndex, callback) =>
                this.#handleGetRoomsRequest(callback, pageSize, pageIndex)
            );
            socket.on(eventNames.GET_ROOM_REQUEST, (roomName, callback) =>
                this.#handleGetRoomRequest(callback, roomName)
            );
            socket.on(eventNames.CREATE_ROOM_REQUEST, (roomName, roomSettings, callback) =>
                this.#handleCreateRoomRequest(socket, callback, roomName, roomSettings)
            );
            socket.on(eventNames.JOIN_ROOM_REQUEST, (username, roomName, callback) =>
                this.#handleJoinRoomRequest(socket, callback, username, roomName)
            );
            socket.on(eventNames.LEAVE_ROOM_REQUEST, (callback) =>
                this.#handleLeaveRoomRequest(socket, callback)
            );
            socket.on(eventNames.KICK_USER_FROM_ROOM_REQUEST, (username, callback) =>
                this.#handleKickUserFromRoomRequest(socket, callback, username)
            );
            socket.on(eventNames.CHANGE_ROOM_OWNER_REQUEST, (newOwnerUsername, callback) =>
                this.#handleChangeRoomOwner(socket, callback, newOwnerUsername)
            );
            socket.on(eventNames.UPDATE_ROOM_SETTINGS_REQUEST, (roomSettings, callback) =>
                this.#handleUpdateRoomSettings(socket, callback, roomSettings)
            );

            socket.on("disconnecting", () => {
                this.#handleLeaveRoomRequest(socket, () => {});
            });
        });
    }

    #handleGetRoomsRequest(callback, pageSize, pageIndex) {
        const { error: err } = getRoomsRequestSchema.validate({
            callback,
            pageSize,
            pageIndex,
        });
        if (err) {
            callback({ success: false, data: err.details[0].message });
            return;
        }
        try {
            const rooms = this.#roomService.getRooms(pageSize, pageIndex);
            callback({
                success: true,
                data: rooms,
            });
        } catch (err) {
            callback({
                success: false,
                data: err,
            });
        }
    }

    #handleGetRoomRequest(callback, roomName) {
        const { error: err } = getRoomRequestSchema.validate({
            callback,
            roomName,
        });
        if (err) {
            callback({ success: false, data: err });
            return;
        }
        try {
            const room = this.#roomService.getRoomByName(roomName);
            callback({
                success: true,
                data: room,
            });
        } catch (err) {
            callback({
                success: false,
                data: err,
            });
        }
    }

    #handleCreateRoomRequest(socket, callback, roomName, roomSettings) {
        const { error: err } = createRoomRequestSchema.validate({
            callback,
            roomName,
            roomSettings,
        });
        if (err) {
            callback({ success: false, data: err });
            return;
        }
        try {
            this.#assertSocketNotInRoom(socket);

            const room = this.#roomService.createRoom(roomName, roomSettings);

            callback({ success: true });

            socket.broadcast.emit(eventNames.ROOM_CREATED_NOTIFICATION, room);
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleJoinRoomRequest(socket, callback, username, roomName) {
        const { error: err } = joinRoomRequestSchema.validate({
            callback,
            username,
            roomName,
        });
        if (err) {
            callback({ success: false, data: err });
            return;
        }
        try {
            this.#assertSocketNotInRoom(socket);

            const room = this.#roomService.getRoomByName(roomName);
            if (!room) {
                throw new RoomNotFoundError(`Room "${roomName}" not found.`);
            }

            room.addMember(username);
            this.#socketToUserMap[socket.id] = username;
            socket.join(roomName);

            callback({ success: true, data: room });

            socket
                .to(roomName)
                .emit(eventNames.USER_JOINED_ROOM_NOTIFICATION, room.getMemberData(username));
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleLeaveRoomRequest(socket, callback) {
        const { error: err } = leaveRoomRequestSchema.validate({
            callback,
        });
        if (err) {
            callback({ success: false, data: err.details[0].message });
            return;
        }
        try {
            this.#assertSocketInRoom(socket);
            const room = this.#getRoomBySocket(socket);
            const username = this.#socketToUserMap[socket.id];
            const ownerChanged = username == room.owner;
            room.removeMember(username);
            if (room.getMemberNames().length == 0) {
                this.#roomService.removeRoom(room.name);
            }
            delete this.#socketToUserMap[socket.id];
            socket.leave(room.name);

            callback({ success: true });

            socket.to(room.name).emit(eventNames.USER_LEFT_ROOM_NOTIFICATION, username);
            if (ownerChanged) {
                socket.to(room.name).emit(eventNames.ROOM_OWNER_CHANGED_NOTIFICATION, room.owner);
            }
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleKickUserFromRoomRequest(socket, callback, targetUsername) {
        const { error: err } = kickUserFromRoomRequestSchema.validate({
            callback,
            targetUsername,
        });
        if (err) {
            callback({ success: false, data: err.details[0].message });
            return;
        }
        try {
            this.#assertSocketInRoom(socket);

            const kickerUsername = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            this.#assertUserIsOwner(kickerUsername, room);

            if (kickerUsername == targetUsername) {
                throw new IllegalOperationError("The owner cannot kick itself from the room");
            }

            room.removeMember(targetUsername);
            this.#io
                .in(room.name)
                .allSockets()
                .then((ids) => {
                    const targetSocketId = [...ids].find(
                        (id) => this.#socketToUserMap[id] == targetUsername
                    );
                    const targetSocket = this.#io.sockets.sockets.get(targetSocketId);
                    delete this.#socketToUserMap[targetSocketId];
                    targetSocket.leave(room.name);

                    callback({ success: true });

                    socket
                        .to(room.name)
                        .emit(eventNames.USER_KICKED_FROM_ROOM_NOTIFICATION, targetUsername);
                });
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleChangeRoomOwner(socket, callback, newOwnerUsername) {
        const { error: err } = changeRoomOwnerRequestSchema.validate({
            callback,
            newOwnerUsername,
        });
        if (err) {
            callback({ success: false, data: err.details[0].message });
            return;
        }
        try {
            this.#assertSocketInRoom(socket);

            const username = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            this.#assertUserIsOwner(username, room);

            room.setOwner(newOwnerUsername);

            callback({ success: true });

            socket.to(room.name).emit(eventNames.ROOM_OWNER_CHANGED_NOTIFICATION, newOwnerUsername);
        } catch (err) {
            callback({ success: false, data: err });
        }
    }

    #handleUpdateRoomSettings(socket, callback, roomSettings) {
        const { error: err } = updateRoomSettingsRequestSchema.validate({
            callback,
            roomSettings,
        });
        if (err) {
            callback({ success: false, data: err.details[0].message });
            return;
        }
        try {
            this.#assertSocketInRoom(socket);

            const username = this.#socketToUserMap[socket.id];
            const room = this.#getRoomBySocket(socket);
            this.#assertUserIsOwner(username, room);

            room.settings = roomSettings;

            callback({ success: true });

            socket.to(room.name).emit(eventNames.ROOM_SETTINGS_UPDATED_NOTIFICATION, roomSettings);
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

    #assertSocketNotInRoom(socket) {
        if (this.#isSocketInRoom(socket)) {
            throw new SocketAlreadyInRoomError(
                `Socket ${socket.id} is already associated with user "${
                    this.#socketToUserMap[socket.id]
                }" in room "${this.#getRoomBySocket(socket).name}".`
            );
        }
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

class SocketAlreadyInRoomError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export default RoomRequestsHandler;
