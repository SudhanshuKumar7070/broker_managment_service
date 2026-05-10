import { Request, Response } from "express";
import {customResponse} from "../utils/ResponseHandler";
import Router from "express";

const router = Router();


router.get("/ping", (_req: Request, res: Response) => {
  return res.status(200).json(new customResponse(200, null, "pong", true));
})
export default router