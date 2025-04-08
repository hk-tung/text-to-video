import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ttsService from "./services/ttsService.js";
import videoService from "./services/videoService.js";
import subtitleService from "./services/subtitleService.js";
import config from "./config/config.js";

class TextToVideo {
  constructor() {
    this.createOutputDirectories();
  }

  /**
   * Create necessary output directories
   */
  createOutputDirectories() {
    const directories = [
      config.tts.outputDir,
      config.video.outputDir,
      config.subtitles.outputDir,
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Combine audio segments into a single file
   * @param {Array<{audioFile: string}>} audioSegments - Array of audio segment files
   * @param {string} outputFile - Path to save the combined audio
   * @returns {Promise<string>} - Path to the combined audio file
   */
  async combineAudioSegments(audioSegments, outputFile) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add all audio segments as inputs
      audioSegments.forEach((segment) => {
        command.input(segment.audioFile);
      });

      // Create the filter complex string for concatenation
      const filterComplex =
        audioSegments.map((_, index) => `[${index}:a]`).join("") +
        `concat=n=${audioSegments.length}:v=0:a=1[outa]`;

      command
        .complexFilter(filterComplex)
        .outputOptions("-map [outa]")
        .output(outputFile)
        .on("end", () => {
          console.log(`Audio segments combined successfully: ${outputFile}`);
          resolve(outputFile);
        })
        .on("error", (err) => {
          console.error(`Error combining audio segments: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get audio duration in milliseconds
   * @param {string} audioFile - Path to the audio file
   * @returns {Promise<number>} - Duration in milliseconds
   */
  async getAudioDuration(audioFile) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioFile, (err, metadata) => {
        if (err) {
          console.error(`Error getting audio duration: ${err.message}`);
          return reject(err);
        }
        const durationMs = Math.floor(metadata.format.duration * 1000);
        resolve(durationMs);
      });
    });
  }

  /**
   * Convert text to video
   * @param {string} text - The text to convert
   * @param {string} imagePattern - Pattern for image sequence (e.g., 'slide%d.jpg')
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Path to the generated video
   */
  async convert(text, imagePattern, options = {}) {
    try {
      // Split text into segments
      const segments = this.splitText(text);

      // Generate audio for each segment
      const audioSegments = await ttsService.generateAudioWithTiming(
        segments,
        config.tts.outputDir
      );

      // Get actual durations for each audio segment
      for (let i = 0; i < audioSegments.length; i++) {
        audioSegments[i].duration = await this.getAudioDuration(
          audioSegments[i].audioFile
        );
      }

      // Combine audio segments
      const combinedAudioFile = path.join(
        config.tts.outputDir,
        "combined_audio.wav"
      );
      await this.combineAudioSegments(audioSegments, combinedAudioFile);

      // Calculate cumulative start times for subtitles
      let currentTime = 0;
      const subtitleSegments = segments.map((segment, index) => {
        const startTime = currentTime;
        currentTime += audioSegments[index].duration;
        return {
          text: segment.text,
          startTime,
          endTime: currentTime,
        };
      });

      // Generate SRT file
      const srtFile = path.join(config.subtitles.outputDir, "subtitles.srt");
      await subtitleService.generateSRT(subtitleSegments, srtFile);

      // Generate video
      const outputVideo = path.join(config.video.outputDir, "output.mp4");
      await videoService.generateVideo(
        imagePattern,
        combinedAudioFile,
        srtFile,
        outputVideo
      );

      return outputVideo;
    } catch (error) {
      console.error("Error in text-to-video conversion:", error);
      throw error;
    }
  }

  /**
   * Split text into segments (basic implementation)
   * @param {string} text - The text to split
   * @returns {Array<{text: string, duration: number}>} - Array of text segments
   */
  splitText(text) {
    // Basic implementation - split by sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map((sentence) => ({
      text: sentence.trim(),
      duration: 5000, // Default 5 seconds per segment
    }));
  }
}

export default new TextToVideo();
