import { io } from "socket.io-client";
import eventNames from "../../common/event-names.mjs";
import { activateElement, deActivateElement, showElement, hideElement } from "./helpers.js";
import { Leaderboard } from "./leaderboard.js";
import { GameClient } from "./state-machine.js";
import RoomData from "./room-data.js";

import "./sass/style.scss";

const gameCanvasID = "game-canvas";

function letTheGameBegin(socket, username, room) {
    const pencilBtn = document.getElementById("pencilBtn");
    const highlighterBtn = document.getElementById("highlighterBtn");
    const eraserBtn = document.getElementById("eraserBtn");
    const guessInput = document.getElementById("guessInput");
    const sendGuess = document.getElementById("sendGuess");
    const startGame = document.getElementById("startGame");

    const roomData = new RoomData(socket, room);

    // eslint-disable-next-line no-unused-vars
    const game = new GameClient(
        socket,
        username,
        room,
        roomData,
        gameCanvasID,
        pencilBtn,
        highlighterBtn,
        eraserBtn,
        guessInput,
        sendGuess,
        startGame
    );

    const leaderboardCardContent = document.getElementById("leaderboard-card-content");
    // eslint-disable-next-line no-unused-vars
    const leaderboard = new Leaderboard(socket, roomData, leaderboardCardContent);
}

window.addEventListener("load", function () {
    const errorModal = document.getElementById("modal-error");
    const errorModalContent = document.getElementById("modal-error-content");

    const socket = io(process.env.SERVER_URL);

    const queryParams = new URLSearchParams(window.location.search);
    const roomName = queryParams.get("id");

    if (queryParams.has("username")) {
        const username = queryParams.get("username");
        socket.emit(eventNames.JOIN_ROOM_REQUEST, username, roomName, (response) => {
            if (response.success) {
                letTheGameBegin(socket, username, response.data);
            } else {
                errorModalContent.innerText = response.data.message;
                activateElement(errorModal);
            }
        });
    } else {
        const setUsernameModal = document.getElementById("modal-set-user-name");
        const setUsernameErrorNotification = document.getElementById(
            "set-user-name-error-notification"
        );
        const usernameInput = document.getElementById("set-user-name");

        hideElement(setUsernameErrorNotification);
        activateElement(setUsernameModal);
        this.document.getElementById("set-user-name-form").addEventListener("submit", (event) => {
            event.preventDefault();
        });
        document
            .getElementById("send-set-user-name-form")
            .addEventListener("click", () =>
                submitSetUsernameForm(
                    usernameInput.value,
                    setUsernameModal,
                    setUsernameErrorNotification
                )
            );
        usernameInput.addEventListener("keydown", (event) => {
            if (event.key == "Enter") {
                submitSetUsernameForm(
                    usernameInput.value,
                    setUsernameModal,
                    setUsernameErrorNotification
                );
                event.stopImmediatePropagation();
            }
        });
    }

    function submitSetUsernameForm(username, setUsernameModal, setUsernameErrorNotification) {
        socket.emit(eventNames.JOIN_ROOM_REQUEST, username, roomName, (response) => {
            if (response.success) {
                deActivateElement(setUsernameModal);
                letTheGameBegin(socket, username, response.data);
            } else {
                setUsernameErrorNotification.innerText = response.data.message;
                showElement(setUsernameErrorNotification);
            }
        });
    }
});
