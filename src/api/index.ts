import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth";
import taskRoutes from "./routes/tasks";
import peopleRoutes from "./routes/people";
import calendarRoutes from "./routes/calendars";
import kidRoutes from "./routes/kids";
import reminderRoutes from "./routes/reminders";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/people", peopleRoutes);
app.use("/calendars", calendarRoutes);
app.use("/kids", kidRoutes);
app.use("/reminders", reminderRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TaskFlow API listening on port ${PORT}`);
});

export default app;
