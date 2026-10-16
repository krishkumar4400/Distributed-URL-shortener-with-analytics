import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello Express");
});

export default app;
