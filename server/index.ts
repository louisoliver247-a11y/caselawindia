import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { app } from "./app.js";
import { config } from "./config.js";
const clientPath = path.resolve(process.cwd(), "dist");
if (existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.get("*", (_req, res) => res.sendFile(path.join(clientPath, "index.html")));
}
app.listen(config.PORT, () => console.log(`CaseLawIndia API listening on http://localhost:${config.PORT}`));
