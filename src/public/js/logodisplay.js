import { logoImage } from "../../common/logo-frames"
import { paletteGrey, paletteColor } from "../../common/colors"
import { Pencil } from "../../common/drawing"

let logoWidth = 700;
let logoHeight = 250;
let yScaleRatio = 1.0;
let xScaleRatio = 1.0;
let logoCanvasID = "logo-canvas";
let bgColor = paletteGrey.getColorByHTMLClass("is-white").hex;
let logoTool = new Pencil();

let offsetX = 15;

/* Create p5js context */
let logoCanvas = new p5((s) => {
    let throttle = 0;
    let frameNr = 0;
    let throttleTreshold = 20;

    function drawLine(px, py, nx, ny) {
        px -= offsetX;
        nx -= offsetX;
        s.line(px*xScaleRatio, py*yScaleRatio, nx*xScaleRatio, ny*yScaleRatio);
    }

    function useTool(dTool) {
        s.stroke(s.color(dTool.color.hex));
        s.strokeWeight(dTool.weight);
        s.strokeCap(s.ROUND);
        s.strokeJoin(s.ROUND);
    }

    function reDraw(drawing) {
        s.clear();
        for (let sh of drawing.shapes) {
            let first = true;
            let prev = null;
            for (let v of sh.coords) {
                if (first) {
                    first = false;
                    prev = v;
                }
                useTool(logoTool);
                drawLine(prev.x, prev.y, v.x, v.y);
                prev = v;
            }
        }
    }

    s.setup = () => {
        s.createCanvas(logoWidth, logoHeight);
        //s.background(s.color(bgColor));
        logoTool.setColor(paletteColor.getRandomColor());
    };

    s.draw = () => {
        if (throttle >= throttleTreshold) {
            throttle = 0;
            if (frameNr >= logoImage.frameCount) {
                frameNr = 0;
            }
            reDraw(logoImage.frames[frameNr]);
            frameNr += 1;
        } 
        throttle += 1;
    };

}, logoCanvasID);
