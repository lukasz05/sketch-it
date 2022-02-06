import { paletteGrey } from "./colors.js";

const COORD_PACK_MAX_LENGTH = 10;
const MAX_POINTS_ON_CANVAS = 1000;
const TRANSITION_TIME = 1000;
const canvasDimX = 400;
const canvasDimY = 400;
const bgColor = paletteGrey.getColorByHTMLClass("is-white").hex;

const MAX_ROOM_MEMBERS_COUNT = 9;
const POINTS_FOR_SUCCESSFUL_GUESS = 100;
const POINTS_FOR_UNSUCCESSFUL_GUESS = -1;

export {
    COORD_PACK_MAX_LENGTH,
    MAX_POINTS_ON_CANVAS,
    TRANSITION_TIME,
    canvasDimY,
    canvasDimX,
    bgColor,
    MAX_ROOM_MEMBERS_COUNT,
    POINTS_FOR_SUCCESSFUL_GUESS,
    POINTS_FOR_UNSUCCESSFUL_GUESS,
};
