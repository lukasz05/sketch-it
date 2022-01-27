function createRoomCard(room) {
    /* Create Tile */
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.classList.add("is-child");
    tile.classList.add("is-primary");

    /* Create Card */
    const card = document.createElement("div");
    card.classList.add("card");

    /* Create card header */
    const cardHeader = document.createElement("header");
    cardHeader.classList.add("card-header");
    const headerTitle = document.createElement("p");
    headerTitle.classList.add("card-header-title");
    const headerContent = document.createTextNode("Room: " + room.name);
    headerTitle.appendChild(headerContent);
    cardHeader.appendChild(headerTitle);

    /* Create card content */
    const cardContent = document.createElement("div");
    cardContent.classList.add("card-content");
    const content = document.createElement("div");
    content.classList.add("content");
    const owner = document.createTextNode("Owner: " + room.owner);
    content.appendChild(owner);
    cardContent.appendChild(content);

    /* Create card footer */
    const cardFooter = document.createElement("footer");
    cardFooter.classList.add("card-footer");
    const roomLink = document.createElement("a");
    roomLink.classList.add("card-footer-item");
    roomLink.href = "/rooms/" + room.name;
    const join = document.createTextNode("Join");
    roomLink.appendChild(join);
    cardFooter.appendChild(roomLink);

    /* Put it all together */
    card.appendChild(cardHeader);
    card.appendChild(cardContent);
    card.appendChild(cardFooter);
    tile.appendChild(card);

    return tile;
}

export { createRoomCard };
