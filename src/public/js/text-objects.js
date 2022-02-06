import { paletteGrey } from "../../common/colors.js";
/* TODO - move this function to utility.js */
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Text objects settings */
const MIN_GUESS_LIFE = 100;
const MAX_GUESS_LIFE = 200;
const INITIAL_GUESS_X = 200;
const INITIAL_GUESS_Y = 400;
const GUESS_ALPHA_STEP = 4;
const GUESS_TEXT_STEP = 0.25;
const INITIAL_TEXT_SIZE = 50;

const SUCCESS_ALPHA_STEP = 1;
const SUCCESS_TEXT_SIZE = 55;
const SUCCESS_LIFETIME = 220;

const TRANSITION_DEATH_X = 600;
const TRANSITION_STEP = 0.015;
const INITIAL_TRANSITION_X = -200;
const INITIAL_TRANSITION_Y = 200;
const INITIAL_TRANSITION_TEXT_SIZE = 70;

const TIMER_TEXT_SIZE = 40;
const TIMER_TEXT_X = 350;
const TIMER_TEXT_Y = 20;
const TIMER_INITIAL_COLOR = paletteGrey.getColorByHTMLClass("is-black").rgb;

const DRAW_ME_TEXT_SIZE = 20;

const DRAW_ME_X = 80;
const DRAW_ME_Y = 20;
const DRAW_ME_COLOR = paletteGrey.getColorByHTMLClass("is-grey-darkest").rgb;

const MAX_ALPHA = 255;

class GuessObject {
    x;
    y;
    dirX;
    dirY;
    text;
    textSize;
    color;
    alpha;
    lifetime;

    constructor(text, color) {
        this.text = text;
        this.x = INITIAL_GUESS_X;
        this.y = INITIAL_GUESS_Y;
        this.color = color;
        this.lifetime = randomInteger(MIN_GUESS_LIFE, MAX_GUESS_LIFE);
        this.dirY = randomInteger(-3, -1);
        this.dirX = randomInteger(-1, 1);
        this.alpha = 255;
        this.textSize = INITIAL_TEXT_SIZE;
    }

    live() {
        if (this.lifetime == 0) {
            return false;
        }
        this.lifetime -= 1;
        this.alpha -= GUESS_ALPHA_STEP;
        this.textSize -= GUESS_TEXT_STEP;
        this.x += this.dirX;
        this.y += this.dirY;
        return true;
    }
}

class SuccessGuessObject {
    x;
    y;
    dirX;
    dirY;
    text;
    textSize;
    color;
    alpha;
    lifetime;

    constructor(text, color, username) {
        this.text = text;
        this.username = username;
        this.x = INITIAL_GUESS_X;
        this.y = INITIAL_GUESS_Y;
        this.color = color;
        this.lifetime = SUCCESS_LIFETIME;
        this.dirY = -2;
        this.dirX = 0;
        this.alpha = MAX_ALPHA;
        this.textSize = SUCCESS_TEXT_SIZE;
    }
    live() {
        if (this.lifetime == 0) {
            return false;
        }
        if (this.lifetime == SUCCESS_LIFETIME / 2) {
            this.text = this.username + "\n guessed!";
            this.textSize /= 2;
        }
        this.lifetime -= 1;
        this.alpha -= SUCCESS_ALPHA_STEP;
        this.x += this.dirX;
        this.y += this.dirY;
        return true;
    }
}

class TransitionObject {
    x;
    y;
    t1;
    t2;
    text;
    textSize;
    color;
    alpha;
    iter;

    constructor(text, color) {
        this.text = text;
        this.x = INITIAL_TRANSITION_X;
        this.y = INITIAL_TRANSITION_Y;
        this.transitionLength = TRANSITION_DEATH_X - INITIAL_TRANSITION_X;
        this.transitionCenter = (INITIAL_TRANSITION_X + TRANSITION_DEATH_X) / 2;
        this.t = 0.0;
        this.color = color;
        this.alpha = MAX_ALPHA;
        this.textSize = INITIAL_TRANSITION_TEXT_SIZE;
    }
    easeInOutSine(x) {
        x = x - Math.floor(x);
        return -(Math.cos(3.15 * x) - 1) / 2;
    }
    live() {
        if (this.t > 2.0) {
            return false;
        }
        if (this.t < 1.0) {
            this.x =
                INITIAL_TRANSITION_X + this.easeInOutSine(this.t) * (this.transitionLength / 2);
        } else {
            this.x =
                this.transitionCenter + this.easeInOutSine(this.t) * (this.transitionLength / 2);
        }
        this.t += TRANSITION_STEP;
        return true;
    }
}

class TimerObject {
    x;
    y;
    textSize;
    color;
    alpha;
    time;
    initialValue;
    constructor() {
        this.textSize = TIMER_TEXT_SIZE;
        this.x = TIMER_TEXT_X;
        this.y = TIMER_TEXT_Y;
        this.alpha = MAX_ALPHA;
        this.color = Object.assign({}, TIMER_INITIAL_COLOR);
        this.time = 0;
        this.initialValue = 0;
    }

    set(time) {
        this.time = time;
        this.initialValue = time;
        this.color = Object.assign({}, TIMER_INITIAL_COLOR);
    }
    tick() {
        if (this.time <= 0) {
            return false;
        }
        this.color.r =
            TIMER_INITIAL_COLOR.r +
            (255 - TIMER_INITIAL_COLOR.r) * ((this.initialValue - this.time) / this.initialValue);
        this.time -= 1;
        return true;
    }
}

class DrawMeObject {
    x;
    y;
    text;
    textSize;
    color;
    alpha;

    constructor() {
        this.textSize = DRAW_ME_TEXT_SIZE;
        this.x = DRAW_ME_X;
        this.y = DRAW_ME_Y;
        this.color = DRAW_ME_COLOR;
        this.alpha = MAX_ALPHA;
        this.text = "";
    }

    displayText(text) {
        this.text = text;
    }
}

export { GuessObject, SuccessGuessObject, TransitionObject, TimerObject, DrawMeObject };
