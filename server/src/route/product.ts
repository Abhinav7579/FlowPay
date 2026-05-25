import express from "express";
import client from "../prismaclient.js";

const productRouter = express.Router();

// Helper to assign mock descriptions dynamically based on product names
const getProductDescription = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("keyboard")) {
    return "High-performance mechanical keyboard featuring hot-swappable tactile switches, double-shot PBT keycaps, and customizable RGB backlighting.";
  }
  if (lowerName.includes("mouse")) {
    return "Ergonomic gaming mouse equipped with a highly precise 16,000 DPI optical sensor, customizable macros, and a lightweight honeycomb design.";
  }
  if (lowerName.includes("headphones")) {
    return "Premium active noise cancelling wireless headphones with dual high-fidelity audio drivers and a comfortable 40-hour battery life.";
  }
  if (lowerName.includes("watch")) {
    return "Elegant smart watch featuring real-time health statistics, continuous heart rate monitor, AMOLED touchscreen, and IP68 water resistance.";
  }
  if (lowerName.includes("speaker")) {
    return "Rugged portable Bluetooth speaker with deep bass radiators, 360-degree surrounding sound signature, and IPX7 waterproof rating.";
  }
  if (lowerName.includes("stand")) {
    return "Ergonomic anodized aluminum laptop stand with dual angle adjustments and an open ventilation structure for superior cooling.";
  }
  if (lowerName.includes("hub")) {
    return "Multi-functional USB-C hub offering 4K HDMI visual output, high-speed USB 3.0 interfaces, SD card readers, and 100W Power Delivery.";
  }
  if (lowerName.includes("ssd")) {
    return "Ultra-fast portable external SSD utilizing a USB 3.2 Gen 2 protocol, offering speeds up to 1050MB/s in a shock-resistant metal casing.";
  }
  return "Premium grade hardware accessory. Carefully manufactured using durable materials and backed by our standard 1-year merchant warranty.";
};

productRouter.get("/", async (req, res) => {
    try {
        const products = await client.product.findMany();
        
        // Fetch all vendors to resolve business names
        const vendors = await client.vendor.findMany({
            include: {
                user: true
            }
        });
        
        const mappedProducts = products.map(product => {
            const vendor = vendors.find(v => v.id === product.vendorId);
            return {
                ...product,
                description: getProductDescription(product.name),
                vendorName: vendor ? vendor.businessName : "FlowPay Partner Tech"
            };
        });
        
        res.json(mappedProducts);
    } catch (err) {
        console.error("Error fetching products: ", err);
        res.status(500).json({ message: "Failed to fetch products" });
    }
});

// Single product details endpoint for checkout
productRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const product = await client.product.findUnique({
            where: { id }
        });
        
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        
        // Find corresponding vendor
        const vendor = await client.vendor.findFirst({
            where: { id: product.vendorId },
            include: { user: true }
        });
        
        res.json({
            ...product,
            description: getProductDescription(product.name),
            vendorName: vendor ? vendor.businessName : "FlowPay Partner Tech"
        });
    } catch (err) {
        console.error("Error fetching product details: ", err);
        res.status(500).json({ message: "Failed to fetch product details" });
    }
});

export default productRouter;