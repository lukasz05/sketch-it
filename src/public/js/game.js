import { paletteGrey, paletteColor } from "../../common/colors";
import { UserData } from "../../common/user";
import { Coord, Drawing } from "../../common/drawing";

/*global p5*/
/*eslint no-undef: "error"*/

/* Canvas settings */
let canvasDimX = 400;
let canvasDimY = 400;
let xScaleRatio = 1.0;
let yScaleRatio = 1.0;
let gameCanvasID = "game-canvas";
let bgColor = paletteGrey.getColorByHTMLClass("is-white").hex;

/* Create random user for testing */
let myUser = new UserData("testowy", paletteColor.colors[5], true, 0);
/* Create and initialize drawing */
let mainDrawing = new Drawing();

/* Create p5js context */
// eslint-disable-next-line no-unused-vars
let game = new p5((s) => {
    /* Global game state */
    let prevCoord = null;

    function drawLine(px, py, nx, ny) {
        s.line(px * xScaleRatio, py * yScaleRatio, nx * xScaleRatio, ny * yScaleRatio);
    }

    function useTool(dTool) {
        s.stroke(s.color(dTool.color.hex));
        s.strokeWeight(dTool.weight);
        s.strokeCap(s.ROUND);
        s.strokeJoin(s.ROUND);
    }
    /*
    function reDraw() {
        s.clear();
        for (let sh of mainDrawing.shapes) {
            let first = true;
            let prev = null;
            for (let v of sh.coords) {
                if (first) {
                    first = false;
                    prev = v;
                }
                useTool(sh.tool);
                drawLine(prev.x, prev.y, v.x, v.y);
                prev = v;
            }
        }
    }

    function showGuess(guess, color) {
        console.log(guess);
    }
*/

    s.setup = () => {
        s.createCanvas(canvasDimX, canvasDimY);
        s.background(s.color(bgColor));
        prevCoord = null;
    };

    s.mousePressed = () => {
        if (myUser.canDraw) {
            prevCoord = new Coord(s.mouseX, s.mouseY);
            mainDrawing.addShape(prevCoord, myUser.currentTool);
        }
    };

    s.mouseReleased = () => {
        if (myUser.canDraw) {
            prevCoord = null;
        }
    };

    s.draw = () => {
        if (myUser.canDraw) {
            /* Drawing mode */
            if (prevCoord != null && s.mouseIsPressed) {
                useTool(myUser.currentTool);
                drawLine(prevCoord.x, prevCoord.y, s.mouseX, s.mouseY);
                prevCoord = new Coord(s.mouseX, s.mouseY);
                mainDrawing.pushCoord(prevCoord);
                /* TODO socket.emit coords */
            }
            if (!s.mouseIsPressed && prevCoord != null) {
                /* TODO socket.emit shape end marker */
                prevCoord = null;
            }
        } else {
            /* Spectating mode */
            /* get data from drawing queue */
            /* TODO */
        }
    };
}, gameCanvasID);
