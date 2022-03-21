import { Palette, paletteColor } from "../../../common/colors.mjs";
import { UserData } from "../../../common/user.mjs";
import { DomainError } from "../../../common/utils.mjs";
import { Drawing } from "../../../common/drawing.mjs";
import {
    MAX_POINTS_ON_CANVAS,
    MAX_ROOM_MEMBERS_COUNT,
    POINTS_FOR_SUCCESSFUL_GUESS,
    POINTS_FOR_UNSUCCESSFUL_GUESS,
} from "../../../common/game-settings.mjs";

class Room {
    name;
    owner;
    members;
    createdAt;
    settings;
    currentlyDrawingUser;
    hasGameStarted;
    drawingEndTime;
    mainDrawing;

    #drawingScheduler;
    #unusedColorsPalette;

    #maxMembersCount;
    #pointsForSuccessfulGuess;
    #pointsForUnsuccessfulGuess;

    constructor(name, settings) {
        this.name = name;
        this.settings = settings;
        this.mainDrawing = new Drawing(MAX_POINTS_ON_CANVAS);

        this.#maxMembersCount = settings.maxMembersCount
            ? settings.maxMembersCount
            : MAX_ROOM_MEMBERS_COUNT;

        this.#pointsForSuccessfulGuess = settings.pointsForSuccessfulGuess
            ? settings.pointsForSuccessfulGuess
            : POINTS_FOR_SUCCESSFUL_GUESS;

        this.#pointsForUnsuccessfulGuess = settings.pointsForUnsuccessfulGuess
            ? settings.pointsForUnsuccessfulGuess
            : POINTS_FOR_UNSUCCESSFUL_GUESS;

        this.owner = null;
        this.members = {};
        this.createdAt = Date.now();
        this.currentlyDrawingUser = null;
        this.drawingEndTime = null;
        this.hasGameStarted = false;

        this.#unusedColorsPalette = new Palette(paletteColor.cloneColorsArray());
    }

    setDrawingScheduler(drawingScheduler) {
        this.#drawingScheduler = drawingScheduler;
        this.#drawingScheduler.addDrawingUserChangedListener(
            (previouslyDrawingUser, currentlyDrawingUser, drawingEndTime) => {
                if (previouslyDrawingUser) {
                    const user = this.members[previouslyDrawingUser];
                    if (user) {
                        this.members[previouslyDrawingUser].canDraw = false;
                    }
                }
                this.members[currentlyDrawingUser].canDraw = true;
                this.currentlyDrawingUser = currentlyDrawingUser;
                this.drawingEndTime = drawingEndTime;
            }
        );
    }

    setGuessingService(guessingService) {
        guessingService.addGuessListener((username, word, success) => {
            if (success) {
                this.members[username].score += this.#pointsForSuccessfulGuess;
            } else {
                this.members[username].score -= this.#pointsForUnsuccessfulGuess;
            }
        });
    }

    getMemberNames() {
        return Object.keys(this.members);
    }

    getMemberData(username) {
        this.#assertUserInRoom(username);
        return this.members[username];
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
        if (this.#drawingScheduler) {
            this.#drawingScheduler.addUser(username);
        }
        if (!this.owner) {
            this.owner = username;
        }
    }

    removeMember(username) {
        this.#assertUserInRoom(username);
        this.#unusedColorsPalette.colors.push(this.members[username].color);
        delete this.members[username];
        if (username == this.owner) {
            this.#chooseNewRandomOwner();
        }
        if (this.#drawingScheduler) {
            this.#drawingScheduler.removeUser(username);
        }
    }

    setOwner(newOwner) {
        this.#assertUserInRoom(newOwner);
        this.owner = newOwner;
    }

    startShape(coordPack, drawingTool) {
        let first = true;
        for (const coord of coordPack) {
            if (first) {
                this.mainDrawing.addShape(coord, drawingTool);
                first = false;
            } else {
                this.mainDrawing.pushCoord(coord);
            }
        }
    }

    pushCoordPack(coordPack) {
        for (const coord of coordPack) {
            this.mainDrawing.pushCoord(coord);
        }
    }

    clearDrawing() {
        this.mainDrawing.clear();
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
            (c) => c.hex != color.hex
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
