import DomainError from "../common/utils.js";

const DRAWING_TIME_LIMIT_IN_SECONDS = 60;

class DrawingScheduler {
    currentlyDrawingUser;
    drawingEndTime;

    #queueToDraw;
    #isSchedulerRunning;
    #timeoutID;
    #drawingUserChangedListeners;

    #drawingTimeLimitInSeconds;

    constructor(users, drawingTimeLimitInSeconds = DRAWING_TIME_LIMIT_IN_SECONDS) {
        this.#queueToDraw = users;
        this.#drawingTimeLimitInSeconds = drawingTimeLimitInSeconds;

        this.#isSchedulerRunning = false;

        this.#drawingUserChangedListeners = [];
    }

    start() {
        if (this.#isSchedulerRunning) {
            throw new SchedulerAlreadyRunningError(`Scheduler is already running.`);
        }
        if (this.#queueToDraw.length == 0) {
            throw new EmptyQueueError(`Queue to draw is empty.`);
        }
        this.#isSchedulerRunning = true;

        this.scheduleNextUser();
    }

    addDrawingUserChangedListener(listener) {
        this.#drawingUserChangedListeners.push(listener);
    }

    scheduleNextUser() {
        if (this.#timeoutID) {
            clearTimeout(this.#timeoutID);
            this.#timeoutID = null;
        }

        this.currentlyDrawingUser = this.#queueToDraw.shift();
        this.#queueToDraw.push(this.currentlyDrawingUser);

        this.#timeoutID = setTimeout(
            () => this.#drawingTimeoutCallback(),
            this.#drawingTimeLimitInSeconds * 1000
        );
        this.drawingEndTime = new Date();
        this.drawingEndTime.setSeconds(
            this.drawingEndTime.getSeconds() + this.#drawingTimeLimitInSeconds
        );
    }

    addUser(username) {
        this.#queueToDraw.push(username);
    }

    removeUser(username) {
        if (this.#isSchedulerRunning()) {
            if (this.#queueToDraw.length == 1) {
                if (this.#timeoutID) {
                    clearTimeout(this.#timeoutID);
                }
                this.#isSchedulerRunning = false;
                this.currentlyDrawingUser = null;
            } else if (username == this.currentlyDrawingUser) {
                this.scheduleNextUser();
            }
        }
        this.#queueToDraw = this.#queueToDraw.filter((u) => u != username);
    }

    #drawingTimeoutCallback() {
        const previouslyDrawingUser = this.currentlyDrawingUser;
        this.scheduleNextUser();
        this.#drawingUserChangedListeners.forEach((listener) =>
            listener({
                previouslyDrawingUser: previouslyDrawingUser,
                currentlyDrawingUser: this.currentlyDrawingUser,
                drawingEndTime: this.drawingEndTime,
            })
        );
    }
}

class EmptyQueueError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class SchedulerAlreadyRunningError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export { DrawingScheduler, DRAWING_TIME_LIMIT_IN_SECONDS };
