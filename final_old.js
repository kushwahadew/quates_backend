const express = require("express");
const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

registerFont("./fonts/NotoSansDevanagari-Regular.ttf", {
    family: "NotoHindi"
});

/* ==========================================================
   📂 LOAD IMAGE GROUPS DYNAMICALLY
========================================================== */

function loadImages(folder) {
    const folderPath = path.join(__dirname, "assets", folder);

    if (!fs.existsSync(folderPath)) return [];

    return fs.readdirSync(folderPath)
        .filter(file =>
            file.endsWith(".png") ||
            file.endsWith(".jpg") ||
            file.endsWith(".jpeg")
        )
        .map(file => path.join(folderPath, file));
}

const imageGroups = {
    mood: loadImages("mood"),
    live: loadImages("live"),
    happy: loadImages("happy")
};

/* ==========================================================
   🎯 MOOD DETECTION
========================================================== */

function detectMood(quote) {
    const q = quote.toLowerCase();

    if (q.includes("money") || q.includes("discipline") || q.includes("focus"))
        return "live";

    if (q.includes("success") || q.includes("growth") || q.includes("win"))
        return "happy";

    return "mood";
}

function getRandomImage(category) {
    let images = imageGroups[category];

    // 🔥 If selected category empty → fallback order
    if (!images || images.length === 0) {
        console.warn(`⚠️ ${category} is empty. Trying fallback...`);

        if (imageGroups.happy.length > 0) {
            images = imageGroups.happy;
            category = "happy";
        } 
        else if (imageGroups.live.length > 0) {
            images = imageGroups.live;
            category = "live";
        } 
        else if (imageGroups.mood.length > 0) {
            images = imageGroups.mood;
            category = "mood";
        } 
        else {
            throw new Error("❌ No images found in any assets folder.");
        }
    }

    const selected =
        images[Math.floor(Math.random() * images.length)];

    console.log("🎯 Selected category:", category);
    console.log("🖼 Selected image:", selected);

    return selected;
}


/* ==========================================================
   ✍️ TEXT WRAPPING
========================================================== */

function wrapLines(ctx, text, maxWidth) {
    const words = text.split(" ");
    let lines = [];
    let line = "";

    for (let word of words) {
        const testLine = line + word + " ";
        const width = ctx.measureText(testLine).width;

        if (width > maxWidth && line !== "") {
            lines.push(line.trim());
            line = word + " ";
        } else {
            line = testLine;
        }
    }

    lines.push(line.trim());
    return lines;
}

/* ==========================================================
   🚀 MAIN ROUTE
========================================================== */

app.post("/generate", async (req, res) => {
    const { quote } = req.body;
    if (!quote) return res.status(400).json({ error: "Quote required" });

    try {
        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext("2d");

        const TOP_PADDING = 80;
        const SPACING = 80;
        const BOTTOM_MARGIN = 60;

        /* ================= BACKGROUND ================= */

        const bg = await loadImage("./paper_background.png");
        ctx.drawImage(bg, 0, 0, 1080, 1080);

        /* ================= PROFILE ================= */

        const profileImg = await loadImage("./profile.jpg");

        const profileSize = 170;
        const profileX = 90;
        const profileY = TOP_PADDING;

        ctx.beginPath();
        ctx.arc(
            profileX + profileSize / 2,
            profileY + profileSize / 2,
            profileSize / 2 + 6,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = "white";
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(
            profileX + profileSize / 2,
            profileY + profileSize / 2,
            profileSize / 2,
            0,
            Math.PI * 2
        );
        ctx.clip();
        ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
        ctx.restore();

        const textStartX = profileX + profileSize + 40;
        const profileCenterY = profileY + profileSize / 2;

        ctx.textAlign = "left";
        ctx.fillStyle = "#111";
        ctx.font = "bold 46px Arial";
        ctx.fillText("Dewraj Kushwaha", textStartX, profileCenterY - 10);

        ctx.font = "26px Arial";
        ctx.fillStyle = "#555";
        ctx.fillText("SDE | FREELANCER", textStartX, profileCenterY + 30);

        /* ================= DYNAMIC IMAGE ================= */

        const category = detectMood(quote);
        const imagePath = getRandomImage(category);
        const silhouette = await loadImage(imagePath);

        const imageScale = 0.60;
        const finalSize = canvas.width * imageScale;

        const imageY = canvas.height - finalSize - BOTTOM_MARGIN;
        const imageX = (canvas.width - finalSize) / 2;

        ctx.save();
        ctx.filter = "grayscale(100%) contrast(100%) brightness(100%)";
        ctx.drawImage(silhouette, imageX, imageY, finalSize, finalSize);
        ctx.restore();

        /* ================= QUOTE ================= */

        const maxWidth = 820;

        ctx.font = "64px NotoHindi";
        ctx.textAlign = "center";
        ctx.fillStyle = "#111";

        const lines = wrapLines(ctx, quote, maxWidth);
        const lineHeight = 64 * 1.5;

        const quoteStartY = profileY + profileSize + SPACING;
        let currentY = quoteStartY;

        lines.forEach((line, index) => {

            if (index === lines.length - 1) {

                const textWidth = ctx.measureText(line).width;
                const highlightPadding = 10;

                ctx.fillStyle = "rgba(255, 235, 59, 0.6)";
                ctx.fillRect(
                    canvas.width / 2 - textWidth / 2 - highlightPadding,
                    currentY - lineHeight / 1.8,
                    textWidth + highlightPadding * 2,
                    lineHeight / 1.3
                );

                ctx.fillStyle = "#111";
            }

            ctx.fillText(line, canvas.width / 2, currentY);
            currentY += lineHeight;
        });

        /* ================= OUTPUT ================= */

        const buffer = canvas.toBuffer("image/png");

        res.set({
            "Content-Type": "image/png",
            "Content-Disposition": "attachment; filename=quote.png"
        });

        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Image generation failed" });
    }
});

app.listen(3001, () => {
    console.log("🔥 Final Quote Engine Running at http://localhost:3001");
});
