import { Palette, paletteColor } from "../common/colors.js";
import { UserData } from "../common/user.js";
import { DomainError } from "../common/utils.js";
import { Drawing } from "../common/drawing.js";
import { MAX_POINTS_ON_CANVAS } from "../common/game-settings.js";

const MAX_ROOM_MEMBERS_COUNT = 9;
const POINTS_FOR_SUCCESSFUL_GUESS = 100;

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
