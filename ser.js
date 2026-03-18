const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "5mb" }));

app.post("/generate", async (req, res) => {
  const { quote } = req.body;

  if (!quote) {
    return res.status(400).json({ error: "Quote is required" });
  }

  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 300,
      height: 250,
      deviceScaleFactor: 3
    });

    // ✅ Your Exact Image Path
    const imagePath = "/home/devraj/Templates/imageQoute/WhatsApp Image 2026-02-15 at 12.03.03 AM.jpeg";

    const imageBase64 = fs.readFileSync(imagePath).toString("base64");

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; }

        .page {
          width: 300px;
          height: 250px;
          background: #000;
          position: relative;
          font-family: Arial, sans-serif;
          color: white;
        }

        .profile-img {
          position: absolute;
          top: 30px;
          left: 19px;
          width: 57px;
          height: 57px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid white;
        }

        .profile-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .name {
          position: absolute;
          top: 38px;
          left: 86px;
          font-size: 15px;
        }

        .role {
          position: absolute;
          top: 64px;
          left: 118px;
          font-size: 9px;
          text-transform: uppercase;
        }

        .quote {
          position: absolute;
          top: 125px;
          left: 37px;
          width: 226px;
          font-size: 10px;
          line-height: 1.4;
        }

        .follow {
          position: absolute;
          bottom: 5px;
          width: 100%;
          text-align: center;
          font-size: 10px;
        }
      </style>
    </head>

    <body>
      <div class="page">
        <div class="profile-img">
          <img src="data:image/jpeg;base64,${imageBase64}" />
        </div>

        <div class="name">Dewraj Kushwaha</div>
        <div class="role">SDE | FREELANCER</div>

        <div class="quote">${quote}</div>

        <div class="follow">FOLLOW US</div>
      </div>
    </body>
    </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 300,
        height: 250
      }
    });

    await browser.close();

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": "attachment; filename=profile-card.png"
    });

    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
