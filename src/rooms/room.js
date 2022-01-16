const DomainError = require("../utils");

class Room {
    name;
    owner;
    score;
    createdAt;

    settings;

    constructor({ name, owner, settings }) {
        this.name = name;
        this.owner = owner;
        this.settings = settings;

        this.score = {};
        this.createdAt = Date.now();

        this.addMember(owner);
    }

    get members() {
        return Object.keys(this.score);
    }

    addMember(username) {
        if (this.#isUserInRoom(username)) {
            throw new UserAlreadyInRoomError(
                `User "${username}" is already a member of the room "${this.name}".`
            );
        }
        this.score[username] = 0;
    }

    removeMember(username) {
        this.#assertUserInRoom(username);
        if (username == this.owner) {
            this.#chooseNewRandomOwner();
        }
        delete this.score[username];
    }

    setOwner(newOwner) {
        this.#assertUserInRoom(newOwner);
        this.owner = newOwner;
    }

    #chooseNewRandomOwner() {
        delete this.score[this.owner];
        const newOwnerIndex = Math.floor(Math.random() * this.members.length);
        this.owner = this.members[newOwnerIndex];
    }

    #isUserInRoom(username) {
        return this.members.includes(username);
    }

    #assertUserInRoom(username) {
        if (!this.#isUserInRoom(username)) {
            throw new UserNotInRoomError(
                `User "${username}" is not a member of the room "${this.name}".`
            );
        }
    }
}

class UserAlreadyInRoomError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class UserNotInRoomError extends DomainError {
    constructor(message) {
        super(message);
    }
}

module.exports = Room;
