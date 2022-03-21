import p5 from "p5";
import { logoImage } from "../../common/logo-frames.mjs";
import { paletteGrey, paletteColor } from "../../common/colors.mjs";
import { Pencil } from "../../common/drawing.mjs";

import "./sass/style.scss";

/* Canvas settings */
const logoWidth = 700;
const logoHeight = 250;
let yScaleRatio = 1.0;
let xScaleRatio = 1.0;
const logoCanvasID = "logo-canvas";
const bgColor = paletteGrey.getColorByHTMLClass("is-white").hex;
const logoTool = new Pencil();
const offsetX = 15;

/* Create p5js context */
// eslint-disable-next-line no-unused-vars
const logoCanvas = new p5((s) => {
    let throttle = 0;
    let frameNr = 0;
    const throttleTreshold = 20;

    function drawLine(px, py, nx, ny) {
        px -= offsetX;
        nx -= offsetX;
        s.line(px * xScaleRatio, py * yScaleRatio, nx * xScaleRatio, ny * yScaleRatio);
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
        s.background(s.color(bgColor));
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
