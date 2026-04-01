const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

/* ================= FONT REGISTRATION ================= */

registerFont(path.join(__dirname, "fonts/InknutAntiqua-Regular.ttf"), {
    family: "Inknut"
});

registerFont(path.join(__dirname, "fonts/NotoSansDevanagari-Regular.ttf"), {
    family: "NotoHindi"
});

/* ================= LOAD IMAGES ================= */

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

/* ================= MOOD ================= */

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

    if (!images || images.length === 0) {
        console.warn(`⚠️ ${category} empty → fallback`);

        if (imageGroups.happy.length > 0) images = imageGroups.happy;
        else if (imageGroups.live.length > 0) images = imageGroups.live;
        else if (imageGroups.mood.length > 0) images = imageGroups.mood;
        else throw new Error("❌ No images found");
    }

    return images[Math.floor(Math.random() * images.length)];
}

/* ================= TEXT WRAP ================= */

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

/* ================= MAIN FUNCTION ================= */

const generateImage = async (processId, quote) => {
    try {
        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext("2d");

        const TOP_PADDING = 80;
        const SPACING = 80;
        const BOTTOM_MARGIN = 60;

        /* BACKGROUND */
        const bg = await loadImage(path.join(__dirname, "paper_background.png"));
        ctx.drawImage(bg, 0, 0, 1080, 1080);

        /* PROFILE */
        const profileImg = await loadImage(path.join(__dirname, "profile.jpg"));

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

        /* HEADER TEXT */
        const textStartX = profileX + profileSize + 40;
        const profileCenterY = profileY + profileSize / 2;

        ctx.textAlign = "left";
        ctx.fillStyle = "#111";
        ctx.font = "bold 46px Arial";
        ctx.fillText("Dewraj Kushwaha", textStartX, profileCenterY - 10);

        ctx.font = "26px Arial";
        ctx.fillStyle = "#555";
        ctx.fillText("SDE | FREELANCER", textStartX, profileCenterY + 30);

        /* IMAGE */
        const category = detectMood(quote);
        const imgPath = getRandomImage(category);
        const silhouette = await loadImage(imgPath);

        const finalSize = canvas.width * 0.60;
        const imageY = canvas.height - finalSize - BOTTOM_MARGIN;
        const imageX = (canvas.width - finalSize) / 2;

        ctx.save();
        ctx.filter = "grayscale(100%) contrast(100%) brightness(100%)";
        ctx.drawImage(silhouette, imageX, imageY, finalSize, finalSize);
        ctx.restore();

        /* ================= QUOTE ================= */

        // ✅ Detect English
        const hasEnglish = /[A-Za-z]/.test(quote);

        // ✅ Apply font
        // ctx.font = hasEnglish
        //     ? "700 60px 'Inknut'"
        //     : "bold 64px 'NotoHindi'";
        ctx.font = "500 52px 'Inknut'";
        ctx.textAlign = "center";
        ctx.fillStyle = "#111";

        // ✅ Styling
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(0,0,0,0.3)";

        // ✅ Wrap text
        const lines = wrapLines(ctx, quote, 820);

        let currentY = profileY + profileSize + SPACING;

        // ✅ Render text
        lines.forEach((line, index) => {
            if (index === lines.length - 1) {
                const width = ctx.measureText(line).width;

                ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
                ctx.fillRect(
                    canvas.width / 2 - width / 2 - 20,
                    currentY - 50,
                    width + 40,
                    70
                );

                ctx.fillStyle = "#111";
            }

            ctx.strokeText(line, canvas.width / 2, currentY);
            ctx.fillText(line, canvas.width / 2, currentY);

            currentY += 96;
        });

        /* SAVE */
        const filePath = path.join(__dirname, `image_${processId}.png`);
        fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

        return filePath;

    } catch (err) {
        console.error("❌ Image generation failed:", err);
        throw err;
    }
};

module.exports = generateImage;