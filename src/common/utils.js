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

export default DomainError;
