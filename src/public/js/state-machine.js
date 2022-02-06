import eventNames from "../../rooms/event-names.js";
import { activateElement, deActivateElement, showElement, hideElement, disableElement, enableElement } from "./helpers.js";
import { Coord, Drawing, Pencil, Highlighter, Eraser } from "../../common/drawing.js";
import { COORD_PACK_MAX_LENGTH, MAX_POINTS_ON_CANVAS, TRANSITION_TIME, canvasDimX, canvasDimY, bgColor } from "../../common/game-settings.js";
import { GuessObject, SuccessGuessObject, TransitionObject, TimerObject } from "./text-objects.js"
import { DomainError } from "../../common/utils.js"


const STATE_DRAWING = Symbol("STATE_DRAWING");
const STATE_GUESSING = Symbol("STATE_GUESSING");
const STATE_IDLE = Symbol("STATE_IDLE");

const PENCIL = Symbol("PENCIL");
const ERASER = Symbol("ERASER");
const HIGHLIGHTER = Symbol("HIGHLIGHTER");


class RoomData {
    name;
    owner;
    members;
    socket;

    constructor(socket, room) {
        this.name = room.name;
        this.owner = room.owner;
        this.members = room.members;
        this.socket = socket;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.socket.on(eventNames.USER_LEFT_ROOM_NOTIFICATION, (username) => {
            delete this.members[username];
        });
        this.socket.on(eventNames.USER_JOINED_ROOM_NOTIFICATION, (userData) => {
            this.members[userData.username] = userData;
        });
        this.socket.on(eventNames.ROOM_OWNER_CHANGED_NOTIFICATION, (username) => {
            this.owner = username;
        });
    }

    getMemberData(username) {
        return this.members[username];
    }

    getUserColor(username) {
        return this.members[username].color;
    }
}


/* TODO - edit room data on other requests */
class GameClient {
    mainDrawing;
    guessInput;
    gameJustStarted;
    interval;
    timer;
    textQueue;
    coordQueue;
    pencilBtn;
    highlighterBtn;
    eraserBtn;
    startGameBtn;
    pencil;
    highlighter;
    eraser;
    sendGuessBtn;
    socket;
    canvas;
    user;
    s;

    constructor(socket, username, room, canvasID, pencilBtn, highlighterBtn, eraserBtn,
                guessInput, sendGuessBtn, startGameBtn) {
        /* Environment objects */
        this.socket = socket;
        this.room = new RoomData(socket, room);
        this.user = this.room.getMemberData(username);
        this.gameJustStarted = false;
        this.currentState = this.stateGuessing;
        this.interval = null;
        this.timer = new TimerObject();
        /* Game UI */
        this.pencilBtn = pencilBtn;
        this.highlighterBtn = highlighterBtn;
        this.eraserBtn = eraserBtn;
        this.guessInput = guessInput;
        this.sendGuessBtn = sendGuessBtn;
        this.startGameBtn = startGameBtn;
        /* Tools */
        this.pencil = new Pencil();
        this.eraser = new Eraser();
        this.highlighter = new Highlighter(this.user.color);
        /* Communication queues */
        this.textQueue = [];
        this.coordQueue = [];
        
        this.s = new p5(this.gameEnvironment.bind(this), canvasID);
        this.initializeEventListeners();
        this.initializeDrawing(room.mainDrawing);

        /* hide and disable start game button for non owners */
        if (this.user.username != this.room.owner) {
            deActivateElement(this.startGameBtn);
            hideElement(this.startGameBtn);
        }
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
        this.startGameBtn.addEventListener("click", () => {
            if (this.user.username == this.room.owner) {
                this.socket.emit(eventNames.START_GAME_REQUEST, () => {});
            }
            deActivateElement(this.startGameBtn);
            hideElement(this.startGameBtn);
        });
    }

    initializeDrawing(drawing) {
        this.mainDrawing = new Drawing(MAX_POINTS_ON_CANVAS);
        if (drawing.size > MAX_POINTS_ON_CANVAS) {
            throw DrawingLoadingError(`Drawing has too many points. Max allowed: ${MAX_POINTS_ON_CANVAS}, drawing.size: ${drawing.size}`);
        }
        this.mainDrawing.size = drawing.size;
        this.mainDrawing.shapes = drawing.shapes;
        this.mainDrawing.currentShape = drawing.currentShape;
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

    isOnCanvas(x, y) {
        if (x <= canvasDimX &&
            x >= 0 &&
            y <= canvasDimY &&
            y >= 0) {
            return true;
        }
        return false;
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
        this.changeState(this.stateIdle);
        let transitionText = "";
        let nextState = this.stateGuessing;
        const userColor = this.room.getUserColor(currentlyDrawingUser).rgb;
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

        /* Restart clock */
        const timeLeft = Math.floor(( drawingEndTime - Date.now() ) / 1000)
        if(this.interval) {
            clearInterval(this.interval);
        }
        this.timer.set(timeLeft);
        this.interval = setInterval(() => {
            this.timer.tick();
        }, 1000);
    }

    handleUserGuess(username, word, success) {
        let color = this.room.getUserColor(username).rgb;
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
                if (this.coordQueue.length != 0) {
                    this.socket.emit(eventNames.DRAWING_COORDS,
                                     this.coordQueue, () => {}
                    );
                }
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
            /* displayTimer */
            let tC = this.timer.color;
            s.fill(s.color(tC.r, tC.g, tC.b));
            s.textFont(s.comicFont);
            s.textSize(this.timer.textSize);
            s.textAlign(s.CENTER, s.CENTER);
            s.text(this.timer.time + "", this.timer.x, this.timer.y);
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
            if (this.prevCoord != null && this.s.mouseIsPressed &&
                this.isOnCanvas(this.s.mouseX, this.s.mouseY)) {
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
            if (this.isOnCanvas(this.s.mouseX, this.s.mouseY)) {
                this.prevCoord = new Coord(this.s.mouseX, this.s.mouseY);
                this.mainDrawing.addShape(this.prevCoord, this.user.currentTool);
                this.coordQueue.push(this.prevCoord);
                this.packetIsFirst = true;
            }
        },
        mouseReleased: () => {
            if (this.prevCoord != null) {
                this.prevCoord = null;
                this.sendCoordPack();
            }
        }
    };
    
    /* Someone else is drawing */
    stateGuessing = {
        state: STATE_GUESSING,
        enterState: () => {
            this.mainDrawing.clear();
            activateElement(this.guessInput);
            enableElement(this.guessInput)

        },
        exitState: () => {
            deActivateElement(this.guessInput);
            disableElement(this.guessInput);
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


class DrawingLoadingError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export { GameClient };
