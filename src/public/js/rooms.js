import { io } from "socket.io-client";
import { createRoomCard } from "../../common/room-card.js";
import eventNames from "../../rooms/event-names.js";
import { activateElement, deActivateElement, showElement, hideElement } from "./helpers.js";
import Joi from "joi";

const refreshRoomsIntervalInMilliseconds = 3000;
const roomsPerPage = 10;
let currentPage = 0;

function displayRooms(rooms) {
    const roomDisplay = document.getElementById("rooms-display");
    /* Remove currently displayed rooms */
    roomDisplay.innerHTML = "";
    if (rooms.length > 0) {
        for (let room of rooms) {
            let card = createRoomCard(room);
            roomDisplay.appendChild(card);
        }
    } else {
        const p = document.createElement("p");
        const message = document.createTextNode("No rooms to display!");
        p.classList.add("has-text-centered");
        p.appendChild(message);
        roomDisplay.appendChild(p);
    }
}

function fetchRooms(socket) {
    socket.emit(eventNames.GET_ROOMS_REQUEST, roomsPerPage, currentPage, (response) => {
        if (response.success) {
            displayRooms(response.data);
        } else {
            /* handle failed responses */
        }
    });
}

window.addEventListener("load", function () {
    const socket = io();

    setInterval(() => {
        fetchRooms(socket);
    }, refreshRoomsIntervalInMilliseconds);

    /* Find forms and disable them */
    const joinModal = document.getElementById("modal-join-room");
    const createModal = document.getElementById("modal-create-room");

    const joinRoomErrorNotification = document.getElementById("join-room-error-notification");
    const createRoomErrorNotification = document.getElementById("create-room-error-notification");

    /* Assign handlers for each button */
    const openRoomCreation = document.getElementById("open-room-creation-form");
    const closeRoomCreation = document.getElementById("close-room-creation-form");
    const sendRoomCreation = document.getElementById("send-room-creation-form");
    const openRoomJoin = document.getElementById("open-room-join-form");
    const closeRoomJoin = document.getElementById("close-room-join-form");
    const sendRoomJoin = document.getElementById("send-room-join-form");

    openRoomCreation.addEventListener("click", () => {
        deActivateElement(joinModal);
        hideElement(createRoomErrorNotification);
        activateElement(createModal);
    });

    closeRoomCreation.addEventListener("click", () => {
        deActivateElement(createModal);
    });

    openRoomJoin.addEventListener("click", () => {
        deActivateElement(createModal);
        hideElement(joinRoomErrorNotification);
        activateElement(joinModal);
    });

    closeRoomJoin.addEventListener("click", () => {
        deActivateElement(joinModal);
    });

    sendRoomCreation.addEventListener("click", () => {
        const roomName = document.getElementById("create-room-name").value;
        const username = document.getElementById("create-user-name").value;

        const usernameSchema = Joi.string().alphanum().min(3).max(10);
        const { error: err } = usernameSchema.validate(username);
        if (err) {
            createRoomErrorNotification.innerText =
                "Player name must be between 3 and 10 alphanumeric characters.";
            showElement(createRoomErrorNotification);
            return;
        }

        socket.emit(eventNames.CREATE_ROOM_REQUEST, roomName, {}, (response) => {
            if (response.success) {
                const url = new URL(`/rooms/${roomName}`, window.location.origin);
                url.searchParams.append("username", username);
                window.location.replace(url);
            } else {
                createRoomErrorNotification.innerText = response.data.message;
                showElement(createRoomErrorNotification);
            }
        });
    });

    sendRoomJoin.addEventListener("click", () => {
        const roomName = document.getElementById("join-room-name").value;
        const username = document.getElementById("join-user-name").value;
        /* Check if room exists and does not contain a member with the name provided by the user */
        socket.emit(eventNames.GET_ROOM_REQUEST, roomName, (response) => {
            let canJoin = true;
            if (response.success) {
                const room = response.data;
                if (!room) {
                    joinRoomErrorNotification.innerText = `Room "${roomName}" not found.`;
                    showElement(joinRoomErrorNotification);
                    canJoin = false;
                } else {
                    const memberNames = Object.keys(room.members);
                    if (memberNames.includes(username)) {
                        joinRoomErrorNotification.innerText = `User "${username}" is already a member of the room "${roomName}".`;
                        showElement(joinRoomErrorNotification);
                        canJoin = false;
                    }
                }
            }
            if (canJoin) {
                const url = new URL(`/rooms/${roomName}`, window.location.origin);
                window.location.replace(url);
            }
        });
    });

    /* TODO! -> all other event listeners + socket.io stuff */
});
