import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mainRouter from "./route/index.js"
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/v1", mainRouter);
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`app running on port ${PORT} `);
});
