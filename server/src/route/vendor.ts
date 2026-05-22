import express from "express"
const vendorRouter=express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleCheck } from "../middleware/roleMiddleware.js";
import { bankSchema } from "../zod.js";
import client from "../prismaclient.js";

vendorRouter.get("/",authMiddleware,roleCheck("VENDOR"),(req,res)=>{
    res.status(200).json({
        success:true,
        message:"Welcome to vendor route"
    })
})
vendorRouter.post("/onboard",authMiddleware,roleCheck("VENDOR"),async(req,res)=>{
    const pareseResult=bankSchema.safeParse(req.body);
    if(!pareseResult.success){
        res.status(400).json({
            success:false,
            message:pareseResult.error.issues[0]?.message
        });
        return;
    }
    const {bussinessName,accountNumber,ifsc}=pareseResult.data;

    const userId=req.user.id;
    try{
        const vendor=await client.vendor.create({
            data:{
                userId:userId,
                businessName:bussinessName,
                bankAccount:accountNumber,
                ifscCode:ifsc
            }
        });
        res.status(201).json({
            success:true,
            message:"Vendor onboarded successfully",
            data:vendor
        });
    }
    catch(error){
        res.status(500).json({
            success:false,
            message:"Internal server error"+error
        });
    }

})

export default vendorRouter;