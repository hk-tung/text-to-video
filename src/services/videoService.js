import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import config from "../config/config.js";

class VideoService {
  constructor() {
    this.config = config.video;
  }

  /**
   * Convert Windows path to FFmpeg compatible path
   * @param {string} windowsPath - Windows style path
   * @returns {string} - FFmpeg compatible path
   */
  convertPath(windowsPath) {
    // Convert to absolute path and normalize
    const absolutePath = path.resolve(windowsPath);
    // Convert backslashes to forward slashes and escape spaces
    return absolutePath.replace(/\\/g, "/").replace(/ /g, "\\ ");
  }

  /**
   * Generate video from images and audio
   * @param {string} imagePattern - Pattern for image sequence (e.g., 'slide%d.jpg')
   * @param {string} audioFile - Path to the audio file
   * @param {string} subtitleFile - Path to the subtitle file
   * @param {string} outputFile - Path to save the output video
   * @returns {Promise<string>} - Path to the generated video file
   */
  async generateVideo(imagePattern, audioFile, subtitleFile, outputFile) {
    return new Promise((resolve, reject) => {
      // Convert paths to FFmpeg format
      const ffmpegImagePattern = this.convertPath(imagePattern);
      const ffmpegAudioFile = this.convertPath(audioFile);
      const ffmpegOutputFile = this.convertPath(outputFile);

      console.log("FFmpeg paths:");
      console.log("Image pattern:", ffmpegImagePattern);
      console.log("Audio file:", ffmpegAudioFile);
      console.log("Output file:", ffmpegOutputFile);

      let command = ffmpeg()
        .input(ffmpegImagePattern)
        .inputFPS(this.config.frameRate)
        .input(ffmpegAudioFile)
        .outputOptions([
          `-c:v ${this.config.codec}`,
          `-preset ${this.config.preset}`,
          `-c:a aac`,
          "-strict experimental",
          "-shortest",
        ])
        .size(this.config.resolution);

      // Add background music if enabled
      if (config.backgroundMusic.enabled) {
        const ffmpegMusicFile = this.convertPath(config.backgroundMusic.path);
        command = command
          .input(ffmpegMusicFile)
          .complexFilter([
            `[2:a]volume=${config.backgroundMusic.volume}[bgm]`,
            "[1:a][bgm]amix=inputs=2:duration=longest[a]",
          ])
          .outputOptions("-map 0:v -map [a]");
      }

      // Log the full command
      command._getArguments((err, args) => {
        if (err) {
          console.error("Error getting FFmpeg arguments:", err);
        } else {
          console.log("FFmpeg command:", "ffmpeg", args.join(" "));
        }
      });

      command
        .output(ffmpegOutputFile)
        .on("start", (commandLine) => {
          console.log("FFmpeg started with command:", commandLine);
        })
        .on("end", () => {
          console.log(`Video generated successfully: ${outputFile}`);
          resolve(outputFile);
        })
        .on("error", (err) => {
          console.error(`Error generating video: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Concatenate multiple videos
   * @param {Array<string>} videoFiles - Array of video file paths
   * @param {string} outputFile - Path to save the concatenated video
   * @returns {Promise<string>} - Path to the concatenated video file
   */
  async concatenateVideos(videoFiles, outputFile) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(path.dirname(outputFile), "concat_list.txt");
      const fileList = videoFiles
        .map((file) => `file '${this.convertPath(file)}'`)
        .join("\n");

      fs.writeFileSync(tempFile, fileList);

      ffmpeg()
        .input(this.convertPath(tempFile))
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .output(this.convertPath(outputFile))
        .on("end", () => {
          console.log(`Videos concatenated successfully: ${outputFile}`);
          fs.unlinkSync(tempFile);
          resolve(outputFile);
        })
        .on("error", (err) => {
          console.error(`Error concatenating videos: ${err.message}`);
          fs.unlinkSync(tempFile);
          reject(err);
        })
        .run();
    });
  }
}

export default new VideoService();
