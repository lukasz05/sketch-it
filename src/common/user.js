import { Pencil } from "./drawing.js"
/* Basic user data definition */

class UserData {
    userID;
    color;
    canDraw;
    score;
    currentTool;
    
    constructor(userID, color, canDraw, score) {
        this.userID = userID;
        this.color = color.hex;
        this.canDraw = canDraw;
        this.score = score;
        this.currentTool = new Pencil();
    }
}

export { UserData };
