const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");

const app = express();
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { quote } = req.body;

  if (!quote) {
    return res.status(400).json({ error: "Quote is required" });
  }

  try {
    const canvas = createCanvas(900, 750); // 3x resolution
    const ctx = canvas.getContext("2d");

    // Black background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load profile image
    const image = await loadImage(
      "/home/devraj/Templates/imageQoute/WhatsApp Image 2026-02-15 at 12.03.03 AM.jpeg"
    );

    // Draw circular image
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 150, 90, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, 30, 60, 180, 180);
    ctx.restore();

    // Name
    ctx.fillStyle = "white";
    ctx.font = "bold 45px Arial";
    ctx.fillText("Dewraj Kushwaha", 260, 140);

    // Role
    ctx.font = "30px Arial";
    ctx.fillText("SDE | FREELANCER", 260, 200);

    // Quote
    ctx.font = "32px Arial";
    wrapText(ctx, quote, 100, 400, 700, 40);

    // Footer
    ctx.font = "28px Arial";
    ctx.fillText("FOLLOW US", 350, 700);

    const buffer = canvas.toBuffer("image/png");

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": "attachment; filename=profile-card.png"
    });

    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
