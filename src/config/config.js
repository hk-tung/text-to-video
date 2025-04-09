export default {
  // TTS Configuration
  tts: {
    model: "tts_models/en/ljspeech/tacotron2-DDC",
    outputFormat: "wav",
    outputDir: "./output/audio",
    command: "tts --text {text} --out_path {output}",
  },

  // FFmpeg Configuration
  ffmpeg: {
    command: "ffmpeg",
    videoOptions: "-c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k",
  },

  // Video Configuration
  video: {
    outputDir: "./output/video",
    frameRate: 1, // 1 frame per second
    resolution: "1920x1080",
    codec: "libx264",
    preset: "fast",
    duration: "longest", // Use the longest duration between audio and video
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
