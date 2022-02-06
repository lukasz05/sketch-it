import Joi from "joi";
import { ValidationError } from "../common/utils.js";

const getRoomsRequestSchema = Joi.object({
    pageSize: Joi.number().integer().min(0).required(),
    pageIndex: Joi.number().integer().min(0).required(),
    callback: Joi.function().required(),
});

const getRoomRequestSchema = Joi.object({
    roomName: Joi.string().required(),
    callback: Joi.function().required(),
});

const createRoomRequestSchema = Joi.object({
    roomName: Joi.string()
        .alphanum()
        .min(3)
        .max(10)
        .required()
        .error(new ValidationError("Room name must be between 3 and 10 alphanumeric characters.")),
    roomSettings: Joi.object().required(),
    callback: Joi.function().required(),
});

const joinRoomRequestSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(10)
        .required()
        .error(
            new ValidationError("Player name must be between 3 and 10 alphanumeric characters.")
        ),
    roomName: Joi.string().required(),
    callback: Joi.function().required(),
});

const kickUserFromRoomRequestSchema = Joi.object({
    targetUsername: Joi.string().required(),
    callback: Joi.function(),
});

const leaveRoomRequestSchema = Joi.object({
    callback: Joi.function().required(),
});

const changeRoomOwnerRequestSchema = Joi.object({
    newOwnerUsername: Joi.string().required(),
    callback: Joi.function().required(),
});

const updateRoomSettingsRequestSchema = Joi.object({
    roomSettings: Joi.object().required(),
    callback: Joi.function().required(),
});

export {
    getRoomsRequestSchema,
    getRoomRequestSchema,
    createRoomRequestSchema,
    joinRoomRequestSchema,
    kickUserFromRoomRequestSchema,
    leaveRoomRequestSchema,
    changeRoomOwnerRequestSchema,
    updateRoomSettingsRequestSchema,
};
