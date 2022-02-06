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

const TRANSITION_DEATH_X = 600;
const TRANSITION_STEP = 0.015;
const INITIAL_TRANSITION_X = -200;
const INITIAL_TRANSITION_Y = 200;
const INITIAL_TRANSITION_TEXT_SIZE = 70;

const TIMER_TEXT_SIZE = 40;
const TIMER_TEXT_X = 350;
const TIMER_TEXT_Y = 20;
const TIMER_INITIAL_COLOR = paletteGrey.getColorByHTMLClass("is-black").rgb;


class GuessObject {
    x;
    y;
    dirX;
    dirY;
    text;
    textSize;
    color;
    lifetime;

    constructor(text, color) {
        this.text = text;
        this.x = INITIAL_GUESS_X;
        this.y = INITIAL_GUESS_Y;
        this.color = color;
        this.lifetime = randomInteger(MIN_GUESS_LIFE, 
                                      MAX_GUESS_LIFE);
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
    lifetime;
    
    constructor(text, color, username) {
        this.text = text;
        this.username = username;
        this.x = INITIAL_GUESS_X;
        this.y = INITIAL_GUESS_Y;
        this.color = color;
        this.lifetime = MAX_GUESS_LIFE*2;
        this.dirY = -0.5;
        this.dirX = 0;
        this.alpha = 255;
        this.textSize = INITIAL_TEXT_SIZE;
    }
    live() {
        if (this.lifetime == 0) {
            return false;
        }
        if (this.lifetime == MAX_GUESS_LIFE) {
            this.text = this.username + "\n guessed!";
            this.textSize /= 2;
        }
        this.lifetime -= 1;
        this.alpha -= GUESS_ALPHA_STEP/2;
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
    iter;
    
    constructor(text, color) {
        this.text = text;
        this.x = INITIAL_TRANSITION_X;
        this.y = INITIAL_TRANSITION_Y;
        this.transitionLength = TRANSITION_DEATH_X - INITIAL_TRANSITION_X;
        this.transitionCenter = (INITIAL_TRANSITION_X + TRANSITION_DEATH_X) / 2;
        this.t = 0.0;
        this.color = color;
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
            this.x = INITIAL_TRANSITION_X 
                     + this.easeInOutSine(this.t)*(this.transitionLength/2); 
        } else {
            this.x = this.transitionCenter 
                     + this.easeInOutSine(this.t)*(this.transitionLength/2); 
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
    time;
    initialValue;
    constructor() {
        this.textSize = TIMER_TEXT_SIZE;
        this.x = TIMER_TEXT_X;
        this.y = TIMER_TEXT_Y;
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
        if(this.time <= 0) { return false }
        this.color.r = TIMER_INITIAL_COLOR.r
                       + (255 - TIMER_INITIAL_COLOR.r) 
                       * ((this.initialValue - this.time)/this.initialValue);
        this.time -= 1;
        return true;
    }
}


export { GuessObject, SuccessGuessObject, TransitionObject, TimerObject};
