import express from "express";
import client from "../prismaclient.js";

const productRouter = express.Router();

productRouter.get("/", async (req, res) => {
    try {
        const products = await client.product.findMany();
        res.json(products);
    } catch (err) {
        console.error("Error fetching products: ", err);
        res.status(500).json({ message: "Failed to fetch products" });
    }
});
export default productRouter;