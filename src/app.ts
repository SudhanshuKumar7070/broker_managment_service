import express from "express";
import cors from "cors";
import healthStatus from  "./route/healthStatus.route"
import tradeRoute from "./route/trade.route";
const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// configuring routers 
app.use("/api/v1/", healthStatus);
app.use("/api/v1/trade", tradeRoute);

// Global Error Handler Middleware
import { NextFunction, Request, Response } from "express";
import { ApiError } from "./utils/ErrorHandler";

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      data: null,
    });
    return;
  }

  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    errors: [err.message],
    data: null,
  });
});

export { app };
