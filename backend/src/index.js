import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";

import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import quizzesRoutes from "./routes/quizzes.route.js";
import gamesRoutes from "./routes/games.route.js";
import playerRoutes from "./routes/player.route.js";
import statsRoutes from "./routes/stats.route.js";
import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();
const __dirname = path.resolve();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(clerkMiddleware());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  }),
);

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/stats", statsRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
