import { z } from "zod";

export const userRegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["ADMIN", "VENDOR", "CUSTOMER"], "Role must be either 'ADMIN' or 'VENDOR' or 'CUSTOMER'")
});

export const userSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long")
});

export const bankSchema = z.object({
  businessName: z.string().min(4, "Business name is required"),
  accountNumber: z
    .string()
    .regex(/^\d{9,18}$/, "Invalid bank account number"),

  ifsc: z
    .string()
    .regex(
      /^[A-Z]{4}0[A-Z0-9]{6}$/,
      "Invalid IFSC code"
    )
});

export const productSchema = z.object({
  name: z
    .string()
    .min(3, "Product name must be at least 3 characters")
    .max(100, "Product name cannot exceed 100 characters"),

  price: z
    .number()
    .positive("Price must be greater than 0"),

  image: z
    .string()
    .url("Please provide a valid image URL")
});
