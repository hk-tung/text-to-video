import textToVideo from "./src/index.js";

async function main() {
  try {
    const text = `
            Welcome to our video presentation.
            This is an example of text-to-video conversion.
            The system uses Coqui TTS for speech synthesis.
            FFmpeg handles the video processing.
            And we have automatic subtitle generation.
        `;

    // Example image pattern (assuming you have slide1.jpg, slide2.jpg, etc.)
    const imagePattern = "./slides/slide%d.jpg";

    // Convert text to video
    const outputVideo = await textToVideo.convert(text, imagePattern);

    console.log("Video generated successfully:", outputVideo);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
