import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";

import { connectDb } from "./db/connectDb";

connectDb()
  .then(() => {
    console.log("Database connection successful");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err: any) => {
    console.log("Database connection error", err);
    process.exit(1);
  });
