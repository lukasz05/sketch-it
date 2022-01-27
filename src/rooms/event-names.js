const eventNames = {
    GET_ROOMS_REQUEST: "get rooms",
    CREATE_ROOM_REQUEST: "create room",
    JOIN_ROOM_REQUEST: "join room",
    LEAVE_ROOM_REQUEST: "leave room",
    KICK_USER_FROM_ROOM_REQUEST: "kick user from room",
    CHANGE_ROOM_OWNER_REQUEST: "change room owner",
    UPDATE_ROOM_SETTINGS_REQUEST: "update room settings",

    ROOM_CREATED_NOTIFICATION: "room created",
    USER_JOINED_ROOM_NOTIFICATION: "user joined room",
    USER_LEFT_ROOM_NOTIFICATION: "user left room",
    USER_KICKED_FROM_ROOM_NOTIFICATION: "user kicked from room",
    ROOM_OWNER_CHANGED_NOTIFICATION: "room owner changed",
    ROOM_SETTINGS_UPDATED_NOTIFICATION: "room settings updated",
};

export default eventNames;
