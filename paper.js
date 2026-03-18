const express = require("express");
const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");

const app = express();
app.use(express.json());

// ---------------- FONT ----------------
registerFont("./fonts/NotoSansDevanagari-Regular.ttf", {
    family: "NotoHindi"
});

// ---------------- IMAGE GROUPS ----------------
const imageGroups = {
    mood: fs.readdirSync("./assets/mood").map(f => `./assets/mood/${f}`),
    live: fs.readdirSync("./assets/live").map(f => `./assets/live/${f}`),
    happy: fs.readdirSync("./assets/happy").map(f => `./assets/happy/${f}`)
};

for (const key in imageGroups) {
    if (imageGroups[key].length === 0) {
        console.warn(`⚠️ Folder assets/${key} is empty`);
    }
}

// ---------------- HELPERS ----------------

function getRandomImage(category) {
    const images = imageGroups[category];

    if (!images || images.length === 0) {
        throw new Error(`No images found in assets/${category}`);
    }

    return images[Math.floor(Math.random() * images.length)];
}


function detectMood(quote) {
    const q = quote.toLowerCase();

    if (q.includes("money") || q.includes("discipline") || q.includes("execution"))
        return "live";

    if (q.includes("success") || q.includes("growth") || q.includes("win"))
        return "happy";

    return "mood";
}

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

function fitText(ctx, text, maxWidth, maxHeight, startSize) {
    let fontSize = startSize;
    let lines = [];

    while (fontSize > 24) {
        ctx.font = `${fontSize}px NotoHindi`;

        lines = wrapLines(ctx, text, maxWidth);

        const lineHeight = fontSize * 1.5;
        const totalHeight = lines.length * lineHeight;

        const widest = Math.max(...lines.map(l => ctx.measureText(l).width));

        if (widest <= maxWidth && totalHeight <= maxHeight) {
            return { fontSize, lines };
        }

        fontSize -= 2;
    }

    return { fontSize: 24, lines };
}

function addFog(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(255,255,255,0.35)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
}

function addGrain(ctx, width, height, intensity = 10) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * intensity;
        data[i] += grain;
        data[i + 1] += grain;
        data[i + 2] += grain;
    }

    ctx.putImageData(imageData, 0, 0);
}

function addVignette(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width / 3,
        width / 2,
        height / 2,
        width / 1.1
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.18)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}


// ---------------- MAIN ROUTE ----------------

app.post("/generate", async (req, res) => {
    const { quote } = req.body;

    if (!quote) {
        return res.status(400).json({ error: "Quote is required" });
    }

    try {
        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext("2d");

        // ---------- BACKGROUND ----------
        const bg = await loadImage("./paper_background.png");
        ctx.drawImage(bg, 0, 0, 1080, 1080);

        // ---------- TEXT SAFE AREA ----------

        const textTopLimit = 300;  // below profile header
        const textBottomLimit = 820; // above bench area

        const maxWidth = 820;
        const maxHeight = textBottomLimit - textTopLimit;

        const { fontSize, lines } = fitText(
            ctx,
            quote,
            maxWidth,
            maxHeight,
            64
        );

        ctx.font = `${fontSize}px NotoHindi`;
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";

        const lineHeight = fontSize * 1.5;
        const totalHeight = lines.length * lineHeight;

        let startY = textTopLimit + (maxHeight - totalHeight) / 2;

        for (let line of lines) {
            ctx.fillText(line, canvas.width / 2, startY);
            startY += lineHeight;
        }


        // ---------- PROFILE HEADER ----------

        const profileImg = await loadImage("./profile.jpg");

        // PROFILE SIZE
        const profileSize = 170;

        const profileX = 90;
        const profileY = 90;

        // Draw white border
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

        // Draw circular profile
        ctx.save();
        ctx.beginPath();
        ctx.arc(
            profileX + profileSize / 2,
            profileY + profileSize / 2,
            profileSize / 2,
            0,
            Math.PI * 2
        );
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
        ctx.restore();

        // TEXT ALIGN RIGHT OF PROFILE

        const textStartX = profileX + profileSize + 40;

        // Vertically align text to center of profile
        const profileCenterY = profileY + profileSize / 2;

        ctx.textAlign = "left";

        // Name
        ctx.fillStyle = "#111";
        ctx.font = "bold 46px Arial";
        ctx.fillText("Dewraj Kushwaha", textStartX, profileCenterY - 10);

        // Subtitle
        ctx.font = "26px Arial";
        ctx.fillStyle = "#444";
        ctx.fillText("SDE | FREELANCER", textStartX, profileCenterY + 30);


        // ---------- IMAGE ----------
        let category = detectMood(quote);

        if (!imageGroups[category] || imageGroups[category].length === 0) {
            category = "happy";
        }

        const imagePath = getRandomImage(category);
        const silhouette = await loadImage(imagePath);

        /*
        ====================================================
         SIZE CONTROL
         Change 0.34 → 0.38 / 0.40 / 0.45 to increase size
        ====================================================
        */
        const finalSize = canvas.width * 0.62;   // 🔼 Bigger bench (~450px on 1080 canvas)

        /*
        ====================================================
         POSITION CONTROL
         Increase second value (260 → 300) to move left
         Increase bottom value (60 → 100) to move upward
        ====================================================
        */
        const posX = canvas.width - finalSize - 260;
        const posY = canvas.height - finalSize - 50;

        /* 
        ====================================================
         OPTIONAL GROUND SHADOW (Currently Disabled)
         Uncomment if needed later
        ====================================================
        
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.ellipse(
            posX + finalSize / 2,
            posY + finalSize - 5,
            finalSize * 0.30,
            18,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
        
        */

        // Draw image
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.filter = "grayscale(100%) contrast(101%) brightness(99%)";

        ctx.drawImage(
            silhouette,
            posX,
            posY,
            finalSize,
            finalSize
        );

        ctx.restore();
        ctx.filter = "none";


        // ---------- EFFECTS ----------
        addFog(ctx, 1080, 1080);
        addGrain(ctx, 1080, 1080, 8);
        addVignette(ctx, 1080, 1080);

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
