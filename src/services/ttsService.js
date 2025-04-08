import { exec } from "child_process";
import path from "path";
import fs from "fs";
import config from "../config/config.js";

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
   * Generate audio from text using Coqui TTS
   * @param {string} text - The text to convert to speech
   * @param {string} outputFile - The output file path
   * @returns {Promise<string>} - Path to the generated audio file
   */
  async generateAudio(text, outputFile) {
    this.ensureOutputDirectory(outputFile);

    return new Promise((resolve, reject) => {
      const command = `tts --text "${text}" --model_name "${this.config.model}" --out_path "${outputFile}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error generating audio: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.warn(`TTS warnings: ${stderr}`);
        }
        console.log(`Audio generated successfully: ${outputFile}`);
        resolve(outputFile);
      });
    });
  }

  /**
   * Generate audio with subtitles timing
   * @param {Array<{text: string, duration: number}>} segments - Array of text segments with durations
   * @param {string} outputDir - Directory to save audio files
   * @returns {Promise<Array<{audioFile: string, duration: number}>>} - Array of generated audio files with durations
   */
  async generateAudioWithTiming(segments, outputDir) {
    this.ensureOutputDirectory(outputDir);
    const results = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const outputFile = path.join(
        outputDir,
        `segment_${i + 1}.${this.config.outputFormat}`
      );

      try {
        await this.generateAudio(segment.text, outputFile);
        results.push({
          audioFile: outputFile,
          duration: segment.duration,
        });
      } catch (error) {
        console.error(`Failed to generate audio for segment ${i + 1}:`, error);
        throw error;
      }
    }

    return results;
  }
}

export default new TTSService();
