import textToVideo from "./src/index.js";
import fs from "fs";
import path from "path";

async function main() {
  try {
    const text = `This is a test video. The video should be the same length as the audio.
    Let's see if the duration is correct now.`;

    // Get current timestamp for output folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = `./output/${timestamp}`;

    // Create slides directory and add a test image
    const slidesDir = path.join(outputDir, "slides");
    if (!fs.existsSync(slidesDir)) {
      fs.mkdirSync(slidesDir, { recursive: true });
    }

    // Create a simple test image
    const imagePath = path.join(slidesDir, "slide1.jpg");
    if (!fs.existsSync(imagePath)) {
      // Create a simple black image using FFmpeg
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      await execAsync(
        `ffmpeg -f lavfi -i color=c=black:s=1920x1080 -frames:v 1 "${imagePath}"`
      );
    }

    // Example image pattern with output directory
    const imagePattern = `${outputDir}/slides/slide%d.jpg`;

    // Convert text to video with specified output directory
    const outputVideo = await textToVideo.convert(text, imagePattern, {
      outputDir,
    });

    console.log("Video generated successfully:", outputVideo);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
