const express = require("express");
require("dotenv").config();
const fs = require("fs");
const generateImage = require("./final");
// const generateVideo = require("./reels"); ❌ not needed

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

/* ================= GENERATE ================= */

app.post("/generate", async (req, res) => {
    const { quote } = req.body;

    if (!quote) {
        return res.status(400).json({ error: "Quote required" });
    }

    const processId = Date.now().toString();

    // Supabase insert
    const { error } = await supabase.from("jobs").insert([
        {
            id: processId,
            status: "processing"
        }
    ]);

    if (error) {
        console.error("❌ Supabase insert error:", error);
    }

    // background process
    processAll(processId, quote);

    res.json({
        processId,
        status: "processing"
    });
});

/* ================= PROCESS ================= */

const processAll = async (processId, quote) => {
    try {
        console.log("🚀 Starting process:", processId);

        // 1. Generate image
        console.log("🖼 Generating image...");
        const imagePath = await generateImage(processId, quote);

        console.log("📁 Image ready:", imagePath);

        // 2. Upload image
        console.log("☁️ Uploading image...");
        const imageUpload = await cloudinary.uploader.upload(imagePath, {
            resource_type: "image",
            timeout: 30000
        });

        console.log("✅ Image URL:", imageUpload.secure_url);

        // ❌ VIDEO REMOVED COMPLETELY
        // const videoPath = await generateVideo(processId, imagePath);

        // 3. Update DB
        await supabase
            .from("jobs")
            .update({
                status: "completed",
                image: imageUpload.secure_url
            })
            .eq("id", processId);

        // 4. Cleanup ONLY image
        setTimeout(() => {
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error("❌ Delete error:", err);
                    } else {
                        console.log("🗑 Deleted:", imagePath);
                    }
                });
            }
        }, 2000);

    } catch (err) {
        console.error(err);

        await supabase
            .from("jobs")
            .update({ status: "failed" })
            .eq("id", processId);
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🔥 Main Server Running on ${PORT}`);
});