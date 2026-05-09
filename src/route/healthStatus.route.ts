import { Request, Response } from "express";
import {customResponse} from "../utils/ResponseHandler";
import Router from "express";

const router = Router();


router.get("/ping",(req:Request,res:Response)=>{
    res.status(200).json(new customResponse(200,null,"pong",true) )
})