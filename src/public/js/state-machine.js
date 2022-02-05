import eventNames from "../../rooms/event-names.js";
import { activateElement, deActivateElement, showElement, hideElement } from "./helpers.js";
import { Coord, Drawing, Pencil, Highlighter, Eraser } from "../../common/drawing.js";
import { COORD_PACK_MAX_LENGTH, MAX_POINTS_ON_CANVAS, TRANSITION_TIME, canvasDimX, canvasDimY, bgColor } from "../../common/game-settings.js";
import { GuessObject, SuccessGuessObject, TransitionObject } from "./text-objects.js"
import { DomainError } from "../../common/utils.js"


const STATE_DRAWING = Symbol("STATE_DRAWING");
const STATE_GUESSING = Symbol("STATE_GUESSING");
const STATE_IDLE = Symbol("STATE_IDLE");

const PENCIL = Symbol("PENCIL");
const ERASER = Symbol("ERASER");
const HIGHLIGHTER = Symbol("HIGHLIGHTER");


/* TODO - edit room data on other requests */
class GameClient {
    mainDrawing;
    guessInput;
    gameJustStarted;
    textQueue;
    coordQueue;
    pencilBtn;
    highlighterBtn;
    eraserBtn;
    startGame;
    pencil;
    highlighter;
    eraser;
    sendGuessBtn;
    socket;
    canvas;
    user;
    s;

    constructor(socket, user, room, canvasID, pencilBtn, highlighterBtn, eraserBtn,
                guessInput, sendGuessBtn, startGame) {
        /* Environment objects */
        this.socket = socket;
        this.user = user;
        this.room = room;
        this.mainDrawing = new Drawing(MAX_POINTS_ON_CANVAS);
        this.gameJustStarted = false;
        this.currentState = this.stateGuessing;
        /* Game UI */
        this.pencilBtn = pencilBtn;
        this.highlighterBtn = highlighterBtn;
        this.eraserBtn = eraserBtn;
        this.guessInput = guessInput;
        this.sendGuessBtn = sendGuessBtn;
        this.startGame = startGame;
        /* Tools */
        this.pencil = new Pencil();
        this.eraser = new Eraser();
        this.highlighter = new Highlighter(user.color);
        /* Communication queues */
        this.textQueue = [];
        this.coordQueue = [];

        this.s = new p5(this.gameEnvironment.bind(this), canvasID);
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.socket.on(eventNames.DRAWING_USER_CHANGED_NOTIFICATION,
                       (previouslyDrawingUser, currentlyDrawingUser, drawingEndTime) => 
            this.handleUserChange(previouslyDrawingUser, currentlyDrawingUser, drawingEndTime)
        );
        this.socket.on(eventNames.USER_TRIED_TO_GUESS_WORD_NOTIFICATION,
                       (username, word, success) => 
            this.handleUserGuess(username, word, success)
        );
        this.socket.on(eventNames.DRAWING_START_NEW_SHAPE,
                       (coordPack, drawingTool) =>
            this.handleShapeStart(coordPack, drawingTool)
        );
        this.socket.on(eventNames.DRAWING_COORDS, (coordPack) => 
            this.handleCoords(coordPack)
        );
        this.socket.on(eventNames.GAME_STARTED_NOTIFICATION, () => 
            this.handleGameStart()
        );

        this.guessInput.addEventListener("keyup", (event) => {
            if (event.keyCode === 13) {
                event.preventDefault();
                this.sendGuess();
            }
        });

        this.sendGuessBtn.addEventListener("click", () => this.sendGuess());
        this.pencilBtn.addEventListener("click", () => this.setTool(PENCIL));
        this.highlighterBtn.addEventListener("click", () => this.setTool(HIGHLIGHTER));
        this.eraserBtn.addEventListener("click", () => this.setTool(ERASER));
        this.startGame.addEventListener("click", () => {
            /* TODO - check if you are owner, disable after sending */
            this.socket.emit(eventNames.START_GAME_REQUEST, () => {});
        });

    }
    
    setTool(_tool) {
        switch (_tool) {
            case PENCIL:
                this.user.currentTool = this.pencil;
            break;
            case HIGHLIGHTER:
                this.user.currentTool = this.highlighter;
            break;
            case ERASER:
                this.user.currentTool = this.eraser;
            break;
            default:
                throw new UnknownToolError(`Tool unknown: "${_tool}"`);
        }
    }

    changeState(_state) {
        this.currentState.exitState();
        this.currentState = _state;
        this.currentState.enterState();
    }

    /* Socket Events -- -- -- -- */

    handleGameStart() {
        this.gameJustStarted = true;
    }

    handleUserChange(previouslyDrawingUser, currentlyDrawingUser, drawingEndTime) {
        /* TODO add clock object and reset it's time? Real users color */
        this.changeState(this.stateIdle);
        let transitionText = "";
        let nextState = this.stateGuessing;
        const userColor = { r:30, g:230, b:120 };
        let timeout = this.gameJustStarted == true
            ? 0 
            : TRANSITION_TIME;
        if (currentlyDrawingUser == this.user.username) {
            nextState = this.stateDrawing;
            transitionText = "YOUR\nTURN!";
        } else {
            transitionText = currentlyDrawingUser +"'s\n TURN!";
        }

        setTimeout(() => {
            this.textQueue.push(new TransitionObject(transitionText, userColor));
            this.changeState(nextState);
        }, timeout);
        this.gameJustStarted = false;
    }

    handleUserGuess(username, word, success) {
        /* TODO get real user's color do not push if in transition mode */
        let color = { r:0, g:255, b:34 };
        if (success) {
            this.textQueue.push(new SuccessGuessObject(word, color, username));
        } else {
            this.textQueue.push(new GuessObject(word, color));
        }
    }

    handleCoords(coordPack) {
        /* Ignore if in drawing state */
        if (this.currentState.state != STATE_DRAWING) {
            for (const coord of coordPack) {
                this.mainDrawing.pushCoord(coord);
            }
        }
    }

    handleShapeStart(coordPack, drawingTool) {
        /* Ignore if in drawing state */
        if (this.currentState.state != STATE_DRAWING) {
            let first = true;
            for (const coord of coordPack) {
                if (first) {
                    this.mainDrawing.addShape(coord, drawingTool);
                    first = false;
                } else {
                    this.mainDrawing.pushCoord(coord);
                }
            }
        }
    }

    sendCoordPack() {
        if (this.currentState.state == STATE_DRAWING) {
            if (this.packetIsFirst) {
                /* emit start shape */
                this.socket.emit(eventNames.DRAWING_START_NEW_SHAPE,
                                 this.coordQueue,
                                 this.user.currentTool,
                                 () => {}
                );
            } else {
                /* emit coordPack */
                this.socket.emit(eventNames.DRAWING_COORDS,
                                 this.coordQueue, () => {}
                );
            }
            this.packetIsFirst = false;
            this.coordQueue = [];
        } else {
            throw new WrongStateError(`User "${this.user.username}" tried to send coordPack but was not in "STATE_DRAWING"!`);
        }
    }

    sendGuess() {
        if (this.currentState.state == STATE_GUESSING) {
            this.socket.emit(eventNames.GUESS_WORD_REQUEST,
                this.guessInput.value,
                () => {}
            );
        } else {
            throw new WrongStateError(`User "${this.user.username}" trying to guess was not in "STATE_GUESSING"!`);
        }
    }
    
    /* -- -- -- -- -- -- -- -- -- -- -- -- */

    /* P5 sketch constructor (defines 'template' for each state) */
    gameEnvironment(s) {

        /* Utility functions -- -- -- -- */

        s.drawLine = (px, py, nx, ny) => {
            s.line(px, py, nx, ny);
        };

        s.useTool = (dTool) => {
            s.stroke(s.color(dTool.color.hex));
            s.strokeWeight(dTool.weight);
            s.strokeCap(s.ROUND);
            s.strokeJoin(s.ROUND);
        };

        s.reDraw = () => {
            for (const sh of this.mainDrawing.shapes) {
                let first = true;
                let prev = null;
                for (const v of sh.coords) {
                    if (first) {
                        first = false;
                        prev = v;
                    }
                    s.useTool(sh.tool);
                    s.drawLine(prev.x, prev.y, v.x, v.y);
                    prev = v;
                }
            }
        }

        s.drawTextObjects = () => {
            s.strokeWeight(0);
            for (let g of this.textQueue) {
                if (g.live()) {
                    s.fill(s.color(g.color.r, g.color.g, g.color.b, g.alpha));
                    s.textFont(s.comicFont);
                    s.textSize(g.textSize);
                    s.textAlign(s.CENTER, s.CENTER);
                    s.text(g.text, g.x, g.y);

                } else {
                    /* delete g from textQueue */
                    const index = this.textQueue.indexOf(g);
                    if (index > -1) {
                        this.textQueue.splice(index, 1);
                    }
                }
            }

        };

        /* p5 callbacks -- -- -- -- */ 

        s.setup = () => {
            s.createCanvas(canvasDimX, canvasDimY);
            this.prevCoord = null;
        };

        s.preload = () => {
            s.comicFont = s.loadFont('/fonts/BaksoSapi.otf');
        };

        s.mousePressed = () => {
            this.currentState.mousePressed();
        };

        s.mouseReleased = () => {
            this.currentState.mouseReleased();
        };

        s.draw = () => {
            s.background(s.color(bgColor));
            this.currentState.draw();
            s.drawTextObjects();            
        };
    }

    /* Game state objects -- -- -- -- */

    prevCoord;
    packetIsFirst;
    
    /* You are drawing */
    stateDrawing = {
        state: STATE_DRAWING,
        enterState: () => {
            this.prevCoord = null;
            this.packetIsFirst = true;
            this.mainDrawing.clear();
            activateElement(this.eraserBtn);
            showElement(this.eraserBtn);
            activateElement(this.pencilBtn);
            showElement(this.pencilBtn);
            activateElement(this.highlighterBtn);
            showElement(this.highlighterBtn);
        
        },
        exitState: () => {
            deActivateElement(this.eraserBtn);
            hideElement(this.eraserBtn);
            deActivateElement(this.pencilBtn);
            hideElement(this.pencilBtn);
            deActivateElement(this.highlighterBtn);
            hideElement(this.highlighterBtn);
        },
        draw: () => {
            this.s.reDraw();
            if (this.prevCoord != null && this.s.mouseIsPressed) {
                this.s.useTool(this.user.currentTool);
                this.s.drawLine(this.prevCoord.x, this.prevCoord.y,
                                this.s.mouseX, this.s.mouseY);
                this.prevCoord = new Coord(this.s.mouseX, this.s.mouseY);
                this.mainDrawing.pushCoord(this.prevCoord);

                /* emit coords */
                this.coordQueue.push(this.prevCoord);
                if (this.coordQueue.length >= COORD_PACK_MAX_LENGTH) {
                    this.sendCoordPack();
                }
            }

        },
        mousePressed: () => {
            this.prevCoord = new Coord(this.s.mouseX, this.s.mouseY);
            this.mainDrawing.addShape(this.prevCoord, this.user.currentTool);
            this.coordQueue.push(this.prevCoord);
            this.packetIsFirst = true;
        },
        mouseReleased: () => {
            this.prevCoord = null;
            this.sendCoordPack();
        }
    };
    
    /* Someone else is drawing */
    stateGuessing = {
        state: STATE_GUESSING,
        enterState: () => {
            this.mainDrawing.clear();
            activateElement(guessInput);

        },
        exitState: () => {
            deActivateElement(guessInput);
        },
        draw: () => {
            this.s.reDraw();
        },
        mousePressed: () => {},
        mouseReleased: () => {}
    };
    
    /* Game has not started yet */
    stateIdle = {
        state: STATE_IDLE,
        enterState: () => {},
        exitState: () => {},
        draw: () => {},
        mousePressed: () => {},
        mouseReleased: () => {}
    }
}

class WrongStateError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class UnknownToolError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export { GameClient };
