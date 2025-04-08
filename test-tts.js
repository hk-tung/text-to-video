const ttsService = require("./src/services/ttsService");

async function testTTS() {
  try {
    const text = "This is a test of the Coqui TTS system.";
    const outputFile = "./output/audio/test.wav";

    console.log("Testing TTS with text:", text);
    const result = await ttsService.generateAudio(text, outputFile);
    console.log("TTS test successful. Output file:", result);
  } catch (error) {
    console.error("TTS test failed:", error);
  }
}

testTTS();
