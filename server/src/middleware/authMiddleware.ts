import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();
const JWT_PASS=process.env.JWT_SECRET || "default_secret_key";

declare global {
    namespace Express {
        interface Request {
            user?: any; 
        }
    }   
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction):void=>{
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({
            success: false,
            message: "Authorization header missing"
        })
        return;
    }
    const token = authHeader?.split(" ")[1];
    if (!token) {
        res.status(401).json({
            success: false,
            message: "Token missing"
        })
        return;
    }
    try{
        const decoed=jwt.verify(token,JWT_PASS);
        req.user=decoed;
        next();

    }
    catch(e){
        res.status(401).json({
            success: false,
            message: "Invalid token" +e
        })
        return;
    }

}
