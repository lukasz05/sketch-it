import { Room } from "./room.js";
import { DomainError, RoomNotFoundError } from "../common/utils.js";

class RoomService {
    #rooms;
    #removeRoomListeners;
    constructor(initialRooms = {}) {
        this.#rooms = initialRooms;
        this.#removeRoomListeners = [];
    }

    addRemoveRoomListener(listener) {
        this.#removeRoomListeners.push(listener);
    }

    getRoomByName(roomName) {
        const room = this.#rooms[roomName];
        return room ? room : null;
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

    createRoom(roomName, roomSettings) {
        if (this.#doesRoomExist(roomName)) {
            throw new RoomAlreadyExistsError(`Room "${roomName}" already exists.`);
        }
        const room = new Room(roomName, roomSettings);
        this.#rooms[roomName] = room;
        return room;
    }

    removeRoom(roomName) {
        this.#assertRoomExists(roomName);
        this.#removeRoomListeners.forEach((listener) => listener(roomName));
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

export default RoomService;
