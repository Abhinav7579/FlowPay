import {z} from "zod";

export const userRegisterSchema=z.object({
    name:z.string().min(1,"Name is required"),
    email:z.string().email("Invalid email address"),
    password:z.string().min(6,"Password must be at least 6 characters long"),
    role:z.enum(["ADMIN","VENDOR","CUSTOMER"],"Role must be either 'ADMIN' or 'VENDOR' or 'CUSTOMER'")
});

export const userSignInSchema=z.object({
    email:z.string().email("Invalid email address"),
    password:z.string().min(6,"Password must be at least 6 characters long")
});
