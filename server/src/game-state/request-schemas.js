import Joi from "joi";

const startGameRequestSchema = Joi.object({
    callback: Joi.function().required(),
});

const guessWordRequestSchema = Joi.object({
    word: Joi.string().max(20).required(),
    callback: Joi.function().required(),
});

const drawingStartNewShapeSchema = Joi.object({
    coordPack: Joi.array()
        .items(
            Joi.object({
                x: Joi.number().required(),
                y: Joi.number().required(),
            })
        )
        .required(),
    drawingTool: Joi.object({
        color: Joi.object().required(),
        weight: Joi.number().required(),
    }),
    callback: Joi.function().required(),
});

const drawingCoordsSchema = Joi.object({
    coordPack: Joi.array()
        .items(
            Joi.object({
                x: Joi.number().required(),
                y: Joi.number().required(),
            })
        )
        .required(),
    callback: Joi.function().required(),
});

export {
    startGameRequestSchema,
    guessWordRequestSchema,
    drawingStartNewShapeSchema,
    drawingCoordsSchema,
};
