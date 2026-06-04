import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import client from "../prismaclient.js";
import dotenv from "dotenv";
dotenv.config();
const JWT_PASS = process.env.JWT_SECRET || "default_secret_key";

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    try {
        const decoded = jwt.verify(token, JWT_PASS);
        req.user = decoded;
        const userr = await client.user.findUnique({
            where: { id: req.user.userId }
        });
        if (!userr) {
            res.status(404).json({
                success: false,
                message: "User not found"
            })
            return;

        }
        if (!userr.isActive) {
            res.status(403).json({
                success: false,
                message: "Account is deactivated"
            })
            return;
        }
        next();

    }
    catch (e) {
        res.status(401).json({
            success: false,
            message: "Invalid token" + e
        })
        return;
    }

}
