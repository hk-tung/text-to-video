import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import config from "../config/config.js";

const execAsync = promisify(exec);

class VideoService {
  /**
   * Convert Windows path to Unix-style path
   * @param {string} windowsPath - Windows-style path
   * @returns {string} - Unix-style path
   */
  convertPath(windowsPath) {
    return windowsPath.replace(/\\/g, "/");
  }

  /**
   * Generate video from audio and subtitles
   * @param {string} imagePattern - Pattern for image sequence (e.g., 'slide%d.jpg')
   * @param {string} audioFile - Path to audio file
   * @param {string} srtFile - Path to SRT file
   * @param {string} outputFile - Path to output video file
   * @returns {Promise<string>} - Path to generated video
   */
  async generateVideo(imagePattern, audioFile, srtFile, outputFile) {
    try {
      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Convert paths to Unix-style
      const unixImagePattern = this.convertPath(imagePattern);
      const unixAudioFile = this.convertPath(audioFile);
      const unixSrtFile = this.convertPath(srtFile);
      const unixOutputFile = this.convertPath(outputFile);

      // Use FFmpeg command to generate video with subtitles
      const command = `${config.ffmpeg.command} -loop 1 -framerate 1 -i "${unixImagePattern}" -i "${unixAudioFile}" -vf "subtitles=${unixSrtFile}" ${config.ffmpeg.videoOptions} -shortest "${unixOutputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error) {
      console.error("Error generating video:", error);
      throw error;
    }
  }

  /**
   * Combine multiple audio files into one
   * @param {Array<string>} audioFiles - Array of audio file paths
   * @param {string} outputFile - Path to output audio file
   * @returns {Promise<string>} - Path to combined audio file
   */
  async combineAudioFiles(audioFiles, outputFile) {
    try {
      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create a temporary file list
      const fileList = path.join(outputDir, "filelist.txt");
      const fileListContent = audioFiles
        .map((file) => `file '${path.resolve(file).replace(/\\/g, "/")}'`)
        .join("\n");

      console.log("File list content:", fileListContent);
      fs.writeFileSync(fileList, fileListContent);

      // Use FFmpeg to concatenate audio files
      const command = `${
        config.ffmpeg.command
      } -f concat -safe 0 -i "${this.convertPath(
        fileList
      )}" -c copy "${this.convertPath(outputFile)}"`;

      console.log("FFmpeg command:", command);
      await execAsync(command);

      // Clean up temporary file
      fs.unlinkSync(fileList);

      return outputFile;
    } catch (error) {
      console.error("Error combining audio files:", error);
      throw error;
    }
  }
}

export default new VideoService();
