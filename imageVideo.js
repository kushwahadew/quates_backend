const express = require("express");
require("dotenv").config();
const fs = require("fs");
const generateImage = require("./final");
const generateVideo = require("./reels");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(express.json());

const jobs = {};

/* ================= GENERATE ================= */

app.post("/generate", async (req, res) => {
    const { quote } = req.body;

    if (!quote) {
        return res.status(400).json({ error: "Quote required" });
    }

    const processId = Date.now().toString();

    jobs[processId] = {
        status: "processing",
        image: null,
        video: null
    };

    processAll(processId, quote);

    res.json({
        processId,
        status: "processing"
    });
});

/* ================= PROCESS ================= */

const processAll = async (processId, quote) => {
    try {
        // 1. image
        console.log("🚀 Starting process:", processId);

console.log("🖼 Generating image...");
const imagePath = await generateImage(processId, quote);

console.log("📁 Image ready:", imagePath);

console.log("☁️ Uploading image...");

        // 2. upload image
        const imageUpload = await cloudinary.uploader.upload(imagePath, {
            resource_type: "image",
            timeout: 60000
        });

        // 3. video
        const videoPath = await generateVideo(processId, imagePath);

        // 4. upload video
        const videoUpload = await cloudinary.uploader.upload(videoPath, {
            resource_type: "video",
            timeout: 120000
        });

        jobs[processId] = {
            status: "completed",
            image: imageUpload.secure_url,
            video: videoUpload.secure_url
        };

        fs.unlinkSync(imagePath);
        fs.unlinkSync(videoPath);

    } catch (err) {
        console.error(err);

        jobs[processId] = {
            status: "failed"
        };
    }
};

/* ================= RESULT ================= */

app.get("/result/:id", (req, res) => {
    const job = jobs[req.params.id];

    if (!job) {
        return res.status(404).json({ error: "Invalid ID" });
    }

    res.json(job);
});

/* ================= START ================= */

const PORT = 3001 || 3002 || 3003;

app.listen(PORT, () => {
    console.log(`🔥 Main Server Running on ${PORT}`);
});