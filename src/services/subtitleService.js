import fs from "fs";
import path from "path";
import SRTParser from "srt-parser-2";
import config from "../config/config.js";

class SubtitleService {
  constructor() {
    this.parser = new SRTParser();
    this.config = config.subtitles;
  }

  /**
   * Format time in milliseconds to SRT timestamp format
   * @param {number} ms - Time in milliseconds
   * @returns {string} - Formatted timestamp (HH:MM:SS,mmm)
   */
  formatTime(ms) {
    const date = new Date(ms);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  /**
   * Generate SRT file from text segments and timings
   * @param {Array<{text: string, startTime: number, endTime: number}>} segments - Array of text segments with timings
   * @param {string} outputFile - Path to save the SRT file
   * @returns {Promise<string>} - Path to the generated SRT file
   */
  async generateSRT(segments, outputFile) {
    const srtContent = segments
      .map((segment, index) => {
        const startTime = this.formatTime(segment.startTime);
        const endTime = this.formatTime(segment.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
      })
      .join("");

    return new Promise((resolve, reject) => {
      fs.writeFile(outputFile, srtContent, (err) => {
        if (err) {
          console.error(`Error generating SRT file: ${err.message}`);
          return reject(err);
        }
        console.log(`SRT file generated successfully: ${outputFile}`);
        resolve(outputFile);
      });
    });
  }

  /**
   * Parse existing SRT file
   * @param {string} srtFile - Path to the SRT file
   * @returns {Promise<Array<{text: string, startTime: number, endTime: number}>>} - Array of parsed segments
   */
  async parseSRT(srtFile) {
    return new Promise((resolve, reject) => {
      fs.readFile(srtFile, "utf8", (err, data) => {
        if (err) {
          console.error(`Error reading SRT file: ${err.message}`);
          return reject(err);
        }

        try {
          const segments = this.parser.fromSrt(data);
          const parsedSegments = segments.map((segment) => ({
            text: segment.text,
            startTime: this.parser.timeMs(segment.startTime),
            endTime: this.parser.timeMs(segment.endTime),
          }));
          resolve(parsedSegments);
        } catch (parseError) {
          console.error(`Error parsing SRT file: ${parseError.message}`);
          reject(parseError);
        }
      });
    });
  }
}

export default new SubtitleService();
