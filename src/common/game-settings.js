import { paletteGrey } from "./colors.js";

const COORD_PACK_MAX_LENGTH = 10;
const MAX_POINTS_ON_CANVAS = 1000;
const TRANSITION_TIME = 1000;
const canvasDimX = 400;
const canvasDimY = 400;
const bgColor = paletteGrey.getColorByHTMLClass("is-white").hex;

export {
    COORD_PACK_MAX_LENGTH,
    MAX_POINTS_ON_CANVAS,
    TRANSITION_TIME,
    canvasDimY,
    canvasDimX,
    bgColor
}; 

