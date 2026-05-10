import { Router } from "express";
import { upload } from "../config/multer.config";
import { importTrades } from "../controller/tradeValidation.controller";

const router = Router();

// POST /import — upload CSV, auto-detect broker, parse & validate trades
router.post("/import", upload.single("file"), importTrades);

export default router;
