class GuessingService {
    currentWord;

    #wordProvider;
    #guessListeners;

    constructor(wordProvider) {
        this.#wordProvider = wordProvider;
        this.currentWord = this.#wordProvider.getRandomWord();
        this.#guessListeners = [];
    }

    guess(username, word) {
        const success = this.currentWord == word;
        this.#notifyListeners(username, word, success);
        if (success) {
            this.currentWord = this.#wordProvider.getRandomWord();
        }
        return success;
    }

    addGuessListener(listener) {
        this.#guessListeners.push(listener);
    }

    #notifyListeners(username, word, success) {
        this.#guessListeners.forEach((listener) => listener(username, word, success));
    }
}

export default GuessingService;
