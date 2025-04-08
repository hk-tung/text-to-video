export default {
  // TTS Configuration
  tts: {
    model: "tts_models/en/ljspeech/tacotron2-DDC",
    outputFormat: "wav",
    outputDir: "./output/audio",
  },

  // Video Configuration
  video: {
    outputDir: "./output/video",
    frameRate: 1 / 5, // 1 frame every 5 seconds
    resolution: "1920x1080",
    codec: "libx264",
    preset: "fast",
  },

  // Subtitle Configuration
  subtitles: {
    outputDir: "./output/subtitles",
    font: "Arial",
    fontSize: 24,
    color: "white",
  },

  // Background Music Configuration
  backgroundMusic: {
    enabled: false,
    volume: 0.3, // 30% volume
    path: "./assets/background-music.mp3",
  },
};
