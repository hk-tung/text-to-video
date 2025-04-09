import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import config from "../config/config.js";

const execAsync = promisify(exec);

class TTSService {
  constructor() {
    this.config = config.tts;
  }

  /**
   * Ensure output directory exists
   * @param {string} outputFile - The output file path
   */
  ensureOutputDirectory(outputFile) {
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Convert Windows path to Unix-style path
   * @param {string} windowsPath - Windows-style path
   * @returns {string} - Unix-style path
   */
  convertPath(windowsPath) {
    return windowsPath.replace(/\\/g, "/");
  }

  /**
   * Escape text for command line
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeText(text) {
    // Escape double quotes and wrap in double quotes
    return `"${text.replace(/"/g, '\\"')}"`;
  }

  /**
   * Generate audio with timing information
   * @param {Array<{text: string}>} segments - Array of text segments
   * @param {string} outputDir - Output directory for audio files
   * @returns {Promise<Array<{text: string, audioFile: string, duration: number}>>} - Array of audio segments with timing
   */
  async generateAudioWithTiming(segments, outputDir) {
    const audioSegments = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const outputFile = path.join(outputDir, `segment_${i + 1}.wav`);

      // Generate audio using TTS
      await this.generateAudio(segment.text, outputFile);

      // Get duration of the audio file
      const duration = await this.getAudioDuration(outputFile);

      audioSegments.push({
        text: segment.text,
        audioFile: outputFile,
        duration,
      });
    }

    return audioSegments;
  }

  /**
   * Generate audio from text using TTS
   * @param {string} text - Text to convert to speech
   * @param {string} outputFile - Output file path
   */
  async generateAudio(text, outputFile) {
    try {
      // Create output directory if it doesn't exist
      this.ensureOutputDirectory(outputFile);

      // Replace placeholders in the command with properly escaped values
      const command = this.config.command
        .replace("{text}", this.escapeText(text))
        .replace("{output}", `"${this.convertPath(outputFile)}"`);

      console.log("Executing TTS command:", command);

      // Use TTS command from config
      await execAsync(command);
    } catch (error) {
      console.error("Error generating audio:", error);
      throw error;
    }
  }

  /**
   * Get duration of an audio file
   * @param {string} audioFile - Path to audio file
   * @returns {Promise<number>} - Duration in seconds
   */
  async getAudioDuration(audioFile) {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${this.convertPath(
        audioFile
      )}"`;
      const { stdout } = await execAsync(command);
      return parseFloat(stdout);
    } catch (error) {
      console.error("Error getting audio duration:", error);
      throw error;
    }
  }
}

export default new TTSService();
