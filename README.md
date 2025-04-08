# Text-to-Video Converter

A Node.js application that converts text to video using Coqui TTS and FFmpeg.

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg (installed and added to PATH)
- Coqui TTS (installed and added to PATH)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd text-to-video
```

2. Install dependencies:

```bash
npm install
```

## Project Structure

```
text-to-video/
├── src/
│   ├── config/
│   │   └── config.js         # Configuration settings
│   ├── services/
│   │   ├── ttsService.js     # Text-to-speech service
│   │   ├── videoService.js   # Video processing service
│   │   └── subtitleService.js # Subtitle generation service
│   └── index.js              # Main application
├── example.js                # Usage example
└── package.json
```

## Configuration

Edit `src/config/config.js` to customize:

- TTS settings (model, output format)
- Video settings (resolution, frame rate)
- Subtitle settings (font, size, color)
- Background music settings

## Usage

1. Prepare your slides as images (e.g., slide1.jpg, slide2.jpg, etc.)
2. Create a script using the example below:

```javascript
const textToVideo = require("./src/index");

async function main() {
  const text = `
        Your text here.
        Each line will be a separate segment.
    `;

  const imagePattern = "./slides/slide%d.jpg";
  const outputVideo = await textToVideo.convert(text, imagePattern);
  console.log("Video generated:", outputVideo);
}

main();
```

## Features

- Text-to-speech conversion using Coqui TTS
- Automatic subtitle generation
- Video processing with FFmpeg
- Support for background music
- Configurable video settings
- Modular architecture for easy extension

## Output

The application generates:

- Audio files in the configured output directory
- SRT subtitle file
- Final video with embedded subtitles

## License

MIT
