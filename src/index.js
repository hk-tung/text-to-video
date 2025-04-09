import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ttsService from "./services/ttsService.js";
import videoService from "./services/videoService.js";
import subtitleService from "./services/subtitleService.js";
import config from "./config/config.js";

class TextToVideo {
  constructor() {
    // Remove auto-creation of directories in constructor
  }

  /**
   * Create necessary output directories
   * @param {string} baseDir - Base directory for output
   */
  createOutputDirectories(baseDir) {
    if (!baseDir) {
      throw new Error("Output directory must be specified");
    }

    const directories = [
      path.join(baseDir, "audio"),
      path.join(baseDir, "video"),
      path.join(baseDir, "subtitles"),
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    return baseDir;
  }

  /**
   * Save metadata about the conversion process
   * @param {string} outputDir - Base output directory
   * @param {string} text - Original text
   * @param {Object} metadata - Additional metadata
   */
  saveMetadata(outputDir, text, metadata = {}) {
    const metadataFile = path.join(outputDir, "metadata.json");
    const textFile = path.join(outputDir, "text.txt");

    // Save original text
    fs.writeFileSync(textFile, text);

    // Save metadata using the same timestamp from the output directory
    const timestamp = path.basename(outputDir);
    const fullMetadata = {
      timestamp,
      ...metadata,
    };
    fs.writeFileSync(metadataFile, JSON.stringify(fullMetadata, null, 2));
  }

  /**
   * Combine audio segments into a single file
   * @param {Array<{audioFile: string}>} audioSegments - Array of audio segment files
   * @param {string} outputFile - Path to save the combined audio
   * @returns {Promise<string>} - Path to the combined audio file
   */
  async combineAudioSegments(audioSegments, outputFile) {
    const audioFiles = audioSegments.map((segment) => segment.audioFile);
    return videoService.combineAudioFiles(audioFiles, outputFile);
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
   * @param {string} options.outputDir - Custom output directory (optional)
   * @returns {Promise<{videoPath: string, outputDir: string}>} - Path to the generated video and output directory
   */
  async convert(text, imagePattern, options = {}) {
    try {
      const startTime = Date.now();
      const outputDir = this.createOutputDirectories(options.outputDir);

      // Split text into segments
      const segments = this.splitText(text);

      // Generate audio for each segment
      const audioSegments = await ttsService.generateAudioWithTiming(
        segments,
        path.join(outputDir, "audio")
      );

      // Get actual durations for each audio segment
      for (let i = 0; i < audioSegments.length; i++) {
        audioSegments[i].duration = await ttsService.getAudioDuration(
          audioSegments[i].audioFile
        );
      }

      // Combine audio segments
      const combinedAudioFile = path.join(
        outputDir,
        "audio",
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
      const srtFile = path.join(outputDir, "subtitles", "subtitles.srt");
      await subtitleService.generateSRT(subtitleSegments, srtFile);

      // Generate video
      const outputVideo = path.join(outputDir, "video", "output.mp4");
      await videoService.generateVideo(
        imagePattern,
        combinedAudioFile,
        srtFile,
        outputVideo
      );

      // Save metadata
      const endTime = Date.now();
      this.saveMetadata(outputDir, text, {
        processingTime: endTime - startTime,
        audioDuration: currentTime,
        segmentCount: segments.length,
        imagePattern,
      });

      return {
        videoPath: outputVideo,
        outputDir: outputDir,
      };
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
    // Clean and normalize the text first
    const cleanText = text
      .replace(/[\r\n]+/g, " ") // Replace newlines with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .replace(/["'"]/g, '"') // Normalize quotes
      .trim();

    // Split by sentences but ensure minimum length
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const segments = [];
    let currentSegment = "";

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();

      // Skip empty sentences
      if (!sentence) continue;

      // If current segment is empty, start with this sentence
      if (!currentSegment) {
        currentSegment = sentence;
      } else {
        // If adding this sentence would make the segment too long, save current segment and start new one
        if ((currentSegment + " " + sentence).length > 200) {
          segments.push({
            text: currentSegment,
            duration: 5000,
          });
          currentSegment = sentence;
        } else {
          // Add sentence to current segment
          currentSegment += " " + sentence;
        }
      }
    }

    // Add the last segment if there is one and it's not too short
    if (currentSegment && currentSegment.length >= 20) {
      // Increased minimum length
      segments.push({
        text: currentSegment,
        duration: 5000,
      });
    } else if (currentSegment) {
      // If the last segment is too short, append it to the last segment if possible
      if (segments.length > 0) {
        segments[segments.length - 1].text += " " + currentSegment;
      } else {
        // If this is the only segment and it's too short, pad it
        segments.push({
          text: currentSegment + ". This is the end of the segment.",
          duration: 5000,
        });
      }
    }

    // Final validation of segments
    return segments.map((segment) => ({
      ...segment,
      text: segment.text.trim().replace(/\s+/g, " "), // Final cleanup of each segment
    }));
  }
}

export default new TextToVideo();
