"use strict";

const express = require("express");

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
app.get("/", (req, res) => {
    res.send('Hello World edited');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
