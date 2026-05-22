import express from "express";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import {userRegisterSchema, userSignInSchema} from "../zod.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const JWT_PASS=process.env.JWT_SECRET || "default_secret_key";
const userRouter = express.Router();
const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL})
})

userRouter.post("/register",async(req,res)  => {
    const parseResult=userRegisterSchema.safeParse(req.body);
    if(!parseResult.success){
        res.status(400).json({
            success:false,
            message: parseResult.error.issues[0]?.message
        });
        return;
    }
    
    const {name,email,password,role}=parseResult.data;

    const usernameExist=await client.user.findUnique({
        where:{
            email:email
        }
    });
    if(usernameExist){
        res.status(400).json({
            success:false,
            message:"Email already exists"
        });
    } else {
        try{
        const hashedPassword=await bcrypt.hash(password,10);
        const user=await client.user.create({
            data:{
                name:name,
                email:email,
                password:hashedPassword,
                role:role
            }
})
 res.status(200).json({
         success:true,
        message:"you are successfully registered",
        userId:user.id
    })

}
catch(error){
    res.status(500).json({
        success:false,
        message:"Internal server error"+error
    }); 
}
    }

});

//signup route
userRouter.post("/signin",async(req,res)=>{
    const parseResult=userSignInSchema.safeParse(req.body);
    if(!parseResult.success){
        res.status(400).json({
            success:false,
            message: parseResult.error.issues[0]?.message
        });
        return;
    }
    
    const {email,password}=parseResult.data;
    const user=await client.user.findUnique({
        where:{
            email:email
        }
    });
    if(!user){
        res.status(400).json({
            success:false,
            message:"Invalid email or password"
        });
    }
    else {
        const isPasswordValid=await bcrypt.compare(password,user.password);
        if(isPasswordValid){
            const token=jwt.sign({userId:user.id,role:user.role},JWT_PASS,{expiresIn:"7h"});
            res.status(200).json({
                success:true,
                message:"you are successfully logged in",
                token:token,
                role:user.role
            });
        }
        else {
            res.status(400).json({
                success:false,
                message:"Invalid email or password"
            });
        }
        
    }
})
export default userRouter;
