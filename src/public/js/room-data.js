import eventNames from "../../rooms/event-names.js";

class RoomData {
    name;
    owner;
    members;
    socket;

    constructor(socket, room) {
        this.name = room.name;
        this.owner = room.owner;
        this.members = room.members;
        this.socket = socket;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.socket.on(eventNames.USER_LEFT_ROOM_NOTIFICATION, (username) => {
            delete this.members[username];
        });
        this.socket.on(eventNames.USER_JOINED_ROOM_NOTIFICATION, (userData) => {
            this.members[userData.username] = userData;
        });
        this.socket.on(eventNames.ROOM_OWNER_CHANGED_NOTIFICATION, (username) => {
            this.owner = username;
        });
    }

    getMemberData(username) {
        return this.members[username];
    }

    getUserColor(username) {
        return this.members[username].color;
    }
}

export default RoomData;
