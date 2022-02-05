import { io } from "socket.io-client";
import eventNames from "../../rooms/event-names.js";
import { activateElement, deActivateElement, showElement, hideElement } from "./helpers.js";
import { GameClient } from "./state-machine.js"
import { UserData } from "../../common/user.js"


const gameCanvasID = "game-canvas";

function letTheGameBegin(socket, user, room) {
    const pencilBtn = document.getElementById("pencilBtn");
    const highlighterBtn = document.getElementById("highlighterBtn");
    const eraserBtn = document.getElementById("eraserBtn");
    const guessInput = document.getElementById("guessInput");
    const sendGuess = document.getElementById("sendGuess");
    const startGame = document.getElementById("startGame");
    const game = new GameClient(socket, user, room, gameCanvasID, pencilBtn,
                          highlighterBtn, eraserBtn, guessInput, sendGuess,
                          startGame);
}

function getUserDataFromRoom(room, username) {
    const _user = room.members[username];
    return new UserData(_user.username, _user.color, _user.canDraw, _user.score);
}

window.addEventListener("load", function () {
    const errorModal = document.getElementById("modal-error");
    const errorModalContent = document.getElementById("modal-error-content");

    const socket = io();
    const roomName = window.location.pathname.split("/")[2];

    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has("username")) {
        const username = queryParams.get("username");
        socket.emit(eventNames.JOIN_ROOM_REQUEST, username, roomName, (response) => {
            if (response.success) {
                letTheGameBegin(socket, getUserDataFromRoom(response.data, username), response.data);
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
        hideElement(setUsernameErrorNotification);
        activateElement(setUsernameModal);
        document.getElementById("send-set-user-name-form").addEventListener("click", function () {
            const username = document.getElementById("set-user-name").value;
            socket.emit(eventNames.JOIN_ROOM_REQUEST, username, roomName, (response) => {
                if (response.success) {
                    deActivateElement(setUsernameModal);
                    letTheGameBegin(socket, getUserDataFromRoom(response.data, username), response.data);
                } else {
                    setUsernameErrorNotification.innerText = response.data.message;
                    showElement(setUsernameErrorNotification);
                }
            });
        });
    }

});
