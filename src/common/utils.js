class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
        };
    }
}

class UserNotPermittedError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class IllegalOperationError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class SocketNotInRoomError extends DomainError {
    constructor(message) {
        super(message);
    }
}

class RoomNotFoundError extends DomainError {
    constructor(message) {
        super(message);
    }
}

export {
    DomainError,
    UserNotPermittedError,
    IllegalOperationError,
    SocketNotInRoomError,
    RoomNotFoundError,
};
