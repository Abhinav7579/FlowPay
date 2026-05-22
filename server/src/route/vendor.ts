import express from "express"
const vendorRouter=express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleCheck } from "../middleware/roleMiddleware.js";
vendorRouter.get("/info",authMiddleware,roleCheck("VENDOR"),(req,res)=>{
    res.status(200).json({
        success:true,
        message:"Welcome to vendor route"
    })
})

export default vendorRouter;