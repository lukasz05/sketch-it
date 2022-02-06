import fs from "fs";

class WordProvider {
    #words;

    constructor(wordsFilePath) {
        const wordsFileContents = fs.readFileSync(wordsFilePath, "utf-8");
        this.#words = JSON.parse(wordsFileContents);
    }

    getRandomWord() {
        return this.#words[Math.floor(Math.random() * this.#words.length)].word;
    }
}

export default WordProvider;
