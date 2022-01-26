import { paletteGrey, paletteColor } from "../../common/colors";
import { UserData } from "../../common/user"
import { Coord,
         Drawing } from "../../common/drawing";

/* Canvas settings */
let canvasDimX = 400;
let canvasDimY = 400;
let xScaleRatio = 1.0;
let yScaleRatio = 1.0;
let bgColor = paletteGrey.getColorByHTMLClass("is-white").hex;
let gameCanvasID = 'game-canvas';

/* Create random user for testing */
let myUser = new UserData("testowy", paletteColor.colors[5], true, 0);
/* Create and initialize drawing */
let mainDrawing = new Drawing();

/* Create p5js context */
let game = new p5((s) => {
    /* Global game state */ 
    let prevCoord = null;

    function drawLine(px, py, nx, ny) {
        s.line(px*xScaleRatio, py*yScaleRatio, nx*xScaleRatio, ny*yScaleRatio);
    }

    function useTool(dTool) {
        s.stroke(s.color(dTool.color.hex));
        s.strokeWeight(dTool.weight);
        s.strokeCap(s.ROUND);
        s.strokeJoin(s.ROUND);
    }

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
        /* TODO implement showing what people are guessing */
        console.log(guess);
    }
    
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
    }

    s.draw = () => {
        if (myUser.canDraw) { /* Drawing mode */
            if (prevCoord != null && s.mousePressed) {
                useTool(myUser.currentTool);
                drawLine(prevCoord.x, prevCoord.y, s.mouseX, s.mouseY);
                prevCoord = new Coord(s.mouseX, s.mouseY);
                mainDrawing.pushCoord(prevCoord);
                /* TODO socket.emit coords */
            }
            if (!s.mousePressed && prevCoord != null) {
                /* TODO socket.emit shape end marker */
                prevCoord = null;
            }
        } else { /* Spectating mode */
            /* get data from drawing queue */
            /* TODO */
        }
    }

}, gameCanvasID);
