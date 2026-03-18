const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

const generateVideo = (processId, imagePath) => {
    return new Promise((resolve, reject) => {

        const videoPath = path.join(__dirname, `video_${processId}.mp4`);
        const musicPath = path.join(__dirname, "assets/music/backgroundMusic.mp3");

        ffmpeg()
            .input(imagePath)
            .loop(10)
            .input(musicPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .duration(10)
            .outputOptions([
                "-vf scale=1080:1920",
                "-pix_fmt yuv420p",
                "-shortest"
            ])
            .save(videoPath)
            .on("end", () => resolve(videoPath))
            .on("error", reject);
    });
};

module.exports = generateVideo;