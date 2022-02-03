import { Pencil } from "./drawing.js";
/* Basic user data definition */

class UserData {
    username;
    color;
    canDraw;
    score;
    currentTool;

    constructor(username, color, canDraw, score) {
        this.username = username;
        this.color = color;
        this.canDraw = canDraw;
        this.score = score;
        this.currentTool = new Pencil();
    }
}

export { UserData };
