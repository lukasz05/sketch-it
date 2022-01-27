import { io } from "socket.io-client";
import { createRoomCard } from "../../common/room-card";
import eventNames from "../../rooms/event-names";


const roomsPerPage = 10;
var currentPage = 0;


function activateElement(element) {
    element.classList.add("is-active");
}


function deActivateElement(element) {
    element.classList.remove("is-active");
}


function displayRooms(rooms) {
    let roomDisplay = document.getElementById("rooms-display");
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


window.addEventListener('load', function() {

    const socket = io();
    
    socket.emit(eventNames.GET_ROOMS_REQUEST, 
                roomsPerPage, currentPage, (response) => {
        if(response.success) {
            displayRooms(response.data);
        } else {
            /* handle failed responses */
        }
    });

    /* Find forms and disable them */
    const joinModal = document.getElementById("modal-join-room");
    const createModal = document.getElementById("modal-create-room");

    /* Assign handlers for each button */
    const openRoomCreation = document.getElementById("open-room-creation-form");
    const closeRoomCreation = document.getElementById("close-room-creation-form");
    const sendRoomCreation = document.getElementById("send-room-creation-form");
    const openRoomJoin = document.getElementById("open-room-join-form");
    const closeRoomJoin = document.getElementById("close-room-join-form");
    const sendRoomJoin = document.getElementById("send-room-join-form");

    openRoomCreation.addEventListener("click", () => {
        deActivateElement(joinModal);
        activateElement(createModal);
    });

    closeRoomCreation.addEventListener("click", () => {
        deActivateElement(createModal);
    });

    openRoomJoin.addEventListener("click", () => {
        deActivateElement(createModal);
        activateElement(joinModal);
    });

    closeRoomJoin.addEventListener("click", () => {
        deActivateElement(joinModal);
    });

    /* TODO! -> all other event listeners + socket.io stuff */
 });
