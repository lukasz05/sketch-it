import {
    POINTS_FOR_SUCCESSFUL_GUESS,
    POINTS_FOR_UNSUCCESSFUL_GUESS,
} from "../../common/game-settings.js";
import eventNames from "../../rooms/event-names.js";

class Leaderboard {
    #socket;
    #room;
    #leaderboardCardContent;

    constructor(socket, room, leaderboardCardContent) {
        this.#socket = socket;
        this.#room = room;
        this.#leaderboardCardContent = leaderboardCardContent;

        this.#initializeEventHandlers();
        this.#renderLeaderboard();
    }

    #initializeEventHandlers() {
        this.#socket.on(
            eventNames.USER_TRIED_TO_GUESS_WORD_NOTIFICATION,
            (username, word, success) => {
                this.#room.members[username].score += success
                    ? POINTS_FOR_SUCCESSFUL_GUESS
                    : POINTS_FOR_UNSUCCESSFUL_GUESS;
                this.#renderLeaderboard();
            }
        );
        this.#socket.on(eventNames.USER_JOINED_ROOM_NOTIFICATION, () => this.#renderLeaderboard());
        this.#socket.on(eventNames.USER_LEFT_ROOM_NOTIFICATION, () => this.#renderLeaderboard());
        this.#socket.on(eventNames.USER_KICKED_FROM_ROOM_NOTIFICATION, () =>
            this.#renderLeaderboard()
        );
    }

    #renderLeaderboard() {
        const table = document.createElement("table");
        table.classList.add("table");
        Object.values(this.#room.members)
            .sort((a, b) => b.score - a.score)
            .forEach((user) => {
                const row = this.#createUserRow(user);
                table.appendChild(row);
            });
        this.#leaderboardCardContent.innerHTML = "";
        this.#leaderboardCardContent.appendChild(table);
    }

    #createUserRow(user) {
        const row = document.createElement("tr");
        row.classList.add("is-uppercase", "has-text-weight-bold");
        row.style.color = user.color.hex;
        const usernameCell = document.createElement("td");
        usernameCell.classList.add("px-5", "py-2");
        usernameCell.innerText = user.username;
        const scoreCell = document.createElement("td");
        scoreCell.classList.add("px-5", "py-2");
        scoreCell.innerText = user.score;
        row.appendChild(usernameCell);
        row.appendChild(scoreCell);
        return row;
    }
}

export { Leaderboard };
