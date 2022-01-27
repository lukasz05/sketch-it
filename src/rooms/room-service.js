import Room from "./room.js";
import DomainError from "../common/utils.js";

class RoomService {
    #rooms;
    constructor(initialRooms = {}) {
        this.#rooms = initialRooms;
    }

    getRoomByName(roomName) {
        this.#assertRoomExists(roomName);
        return this.#rooms[roomName];
    }

    getRooms(pageSize, pageIndex) {
        if (pageSize < 0 || pageIndex < 0) {
            return [];
        }
        const startIndex = pageSize * pageIndex;
        const endIndex = startIndex + pageSize;
        return this.getAllRooms().slice(startIndex, endIndex);
    }

    getAllRooms() {
        return Object.values(this.#rooms).sort((a, b) => b.createdAt - a.createdAt);
    }

    setRooms(rooms) {
        this.#rooms = rooms;
    }

    createRoom(username, roomName, roomSettings) {
        if (this.#doesRoomExist(roomName)) {
            throw new RoomAlreadyExistsError(`Room "${roomName}" already exists.`);
        }
        const room = new Room({
            name: roomName,
            owner: username,
            settings: roomSettings,
        });
        this.#rooms[roomName] = room;
        return room;
    }

    removeRoom(roomName) {
        this.#assertRoomExists(roomName);
        delete this.#rooms[roomName];
    }

    #doesRoomExist(roomName) {
        return roomName in this.#rooms;
    }

    #assertRoomExists(roomName) {
        if (!this.#doesRoomExist(roomName)) {
            throw new RoomNotFoundError(`Room "${roomName}" not found.`);
        }
    }
}

class RoomAlreadyExistsError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class RoomNotFoundError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export default RoomService;
