import { Palette, paletteColor } from "../common/colors.js";
import { UserData } from "../common/user.js";
import DomainError from "../common/utils.js";

const MAX_ROOM_MEMBERS_COUNT = 9;

class Room {
    name;
    owner;
    members;

    createdAt;
    settings;

    #maxMembersCount;

    #unusedColorsPalette;

    constructor({ name, owner, settings }) {
        this.name = name;
        this.owner = owner;
        this.settings = settings;

        this.#maxMembersCount = settings.maxMembersCount
            ? settings.maxMembersCount
            : MAX_ROOM_MEMBERS_COUNT;

        this.members = {};
        this.createdAt = Date.now();

        this.#unusedColorsPalette = new Palette(paletteColor.cloneColorsArray());

        this.addMember(owner);
    }

    getMemberNames() {
        return Object.keys(this.members);
    }

    addMember(username) {
        if (this.#isUserInRoom(username)) {
            throw new UserAlreadyInRoomError(
                `User "${username}" is already a member of the room "${this.name}".`
            );
        }
        if (this.getMemberNames().length == this.#maxMembersCount) {
            throw new RoomAlreadyFullError(`Room "${this.name}" is already full.`);
        }
        this.members[username] = new UserData(username, this.#pickColorForUser(), false, 0);
    }

    removeMember(username) {
        this.#assertUserInRoom(username);
        this.#unusedColorsPalette.colors.push(this.members[username].color);
        delete this.members[username];
        if (username == this.owner) {
            this.#chooseNewRandomOwner();
        }
    }

    setOwner(newOwner) {
        this.#assertUserInRoom(newOwner);
        this.owner = newOwner;
    }

    #chooseNewRandomOwner() {
        const newOwnerIndex = Math.floor(Math.random() * this.getMemberNames().length);
        this.owner = this.getMemberNames()[newOwnerIndex];
    }

    #isUserInRoom(username) {
        return Object.keys(this.members).includes(username);
    }

    #pickColorForUser() {
        const color = this.#unusedColorsPalette.getRandomColor();
        this.#unusedColorsPalette.colors = this.#unusedColorsPalette.colors.filter(
            (c) => c.hex == color.hex
        );
        return color;
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

class RoomAlreadyFullError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export { Room, MAX_ROOM_MEMBERS_COUNT };
