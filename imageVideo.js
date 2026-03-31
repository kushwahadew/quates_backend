const express = require("express");
require("dotenv").config();
const fs = require("fs");
const generateImage = require("./final");
const generateVideo = require("./reels");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

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

    // Supabase insert
    const { data, error } = await supabase.from("jobs").insert([
        {
            id: processId,
            status: "processing"
        }
    ]);

    if (error) {
        console.error("❌ Supabase insert error:", error);
    } else {
        console.log("✅ Job inserted:", data);
    }

    // background process
    processAll(processId, quote);

    // ✅ VERY IMPORTANT
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
        const imageUpload = await cloudinary.uploader.upload(imagePath, {
            resource_type: "image",
            timeout: 20000
        });
        console.log("✅ Image URL:", imageUpload.secure_url);

        console.log("🎬 Generating video...");
        const videoPath = await generateVideo(processId, imagePath);

        // const videoUpload = await cloudinary.uploader.upload(videoPath, {
        //     resource_type: "video",
        //     timeout: 20000
        // });
        // console.log("🎥 Video URL:", videoUpload.secure_url);

        await supabase
            .from("jobs")
            .update({
                status: "completed",
                image: imageUpload.secure_url,
                // video: videoUpload.secure_url
            })
            .eq("id", processId);

        // setTimeout(() => {
        //     [imagePath, videoPath].forEach((file) => {
        //         if (fs.existsSync(file)) {
        //             fs.unlink(file, (err) => {
        //                 if (err) {
        //                     console.error("❌ Delete error:", err);
        //                 } else {
        //                     console.log("🗑 Deleted:", file);
        //                 }
        //             });
        //         }
        //     });
        // }, 2000);

    } catch (err) {
        console.error(err);

        jobs[processId] = {
            status: "failed"
        };
    }
};

/* ================= RESULT ================= */

app.get("/result/:id", async (req, res) => {
    const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (error || !data) {
        return res.status(404).json({ error: "Not found" });
    }

    res.json(data);
});
/* ================= START ================= */

const PORT = 3001 || 3002 || 3003;

app.listen(PORT, () => {
    console.log(`🔥 Main Server Running on ${PORT}`);
});