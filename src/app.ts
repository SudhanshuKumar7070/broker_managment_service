import express from "express";
import cors from "cors";
import healthStatus from  "./route/healthStatus.route"
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
app.use("/api/v1/ping",healthStatus) 

export { app };
