# AI Video Stream Interpreter (TypeScript)

A real-time AI video stream interpreter built with TypeScript, Node.js, and OpenCV that can analyze video streams and provide intelligent insights with Roboflow integration.

## Features

- **Real-time video stream processing** with minimal latency
- **Multiple AI models** (COCO, YOLOv8, OCR, Custom Roboflow models)
- **Flexible video sources** (webcam, video files, RTSP streams)
- **Detection visualization** with real-time bounding boxes and labels
- **Performance monitoring** with FPS tracking and statistics
- **Web interface** with real-time updates via WebSocket
- **Command-line interface** for automation and scripting
- **Detection storage** with metadata and frame capture
- **TypeScript** for type safety and better development experience

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **OpenCV4Nodejs** - Computer vision library
- **Express.js** - Web server framework
- **Socket.IO** - Real-time WebSocket communication
- **Winston** - Logging framework
- **Roboflow** - AI model integration

## Quick Start

### Prerequisites

- Node.js 16.0 or higher
- OpenCV development libraries
- Webcam or video source

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ai-video-stream-interpreter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application:**
   ```bash
   # Command line interface
   npm start -- --source 0 --model coco

   # Web interface
   npm run web
   ```

## Usage

### Command Line Interface

```bash
# Basic usage with webcam
npm start -- --source 0 --model coco

# Video file processing
npm start -- --source video.mp4 --model yolo --confidence 0.7

# RTSP stream with OCR
npm start -- --source rtsp://camera-ip:554/stream --model ocr

# Custom Roboflow model
npm start -- --source 0 --model your-custom-model
```

### Web Interface

```bash
npm run web
```

Then open `http://localhost:3000` in your browser.

### Development Mode

```bash
# Run in development mode with hot reload
npm run dev

# Run demo
npm run demo
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Roboflow API Configuration
ROBOFLOW_API_KEY=your_roboflow_api_key_here

# Model Configuration
DEFAULT_MODEL=coco
CONFIDENCE_THRESHOLD=0.5

# Video Stream Configuration
DEFAULT_SOURCE=0
FRAME_RATE=30
RESOLUTION_WIDTH=640
RESOLUTION_HEIGHT=480

# Output Configuration
SAVE_DETECTIONS=true
OUTPUT_DIR=./output
LOG_LEVEL=info
```

### Command Line Options

- `--source`: Video source (0 for webcam, file path, or RTSP URL)
- `--model`: AI model to use (coco, yolo, ocr, or custom)
- `--confidence`: Confidence threshold (0.0 to 1.0)
- `--output`: Output directory for saved detections
- `--web`: Launch web interface instead of command line

## Supported Models

### 1. COCO Model (Object Detection)
- **Description**: General-purpose object detection
- **Classes**: 80 common objects (person, car, dog, etc.)
- **Use Case**: General object detection and tracking
- **Performance**: Good balance of speed and accuracy

### 2. YOLOv8 Model (Object Detection)
- **Description**: Latest YOLO model for fast object detection
- **Classes**: 80 common objects
- **Use Case**: High-speed object detection
- **Performance**: Fastest among supported models

### 3. OCR Model (Text Recognition)
- **Description**: Optical Character Recognition for text detection
- **Use Case**: Reading text from video streams
- **Requirements**: Tesseract OCR installation
- **Performance**: Moderate speed, high accuracy for clear text

### 4. Custom Roboflow Models
- **Description**: User-trained models from Roboflow platform
- **Use Case**: Specialized detection tasks
- **Setup**: Requires Roboflow API key and model name
- **Performance**: Varies based on model complexity

## Project Structure

```
├── src/
│   ├── main.ts                 # Main application entry point
│   ├── video-interpreter.ts    # Core video processing logic
│   ├── web-server.ts          # Web server with WebSocket support
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── models/
│   │   └── model-manager.ts   # AI model management
│   └── utils/
│       ├── logger.ts          # Logging utilities
│       └── video-utils.ts     # Video processing utilities
├── public/
│   └── index.html             # Web interface
├── dist/                      # Compiled JavaScript output
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## API Reference

### VideoInterpreter Class

```typescript
class VideoInterpreter {
  constructor(
    source: string | number,
    modelName: string,
    confidenceThreshold: number,
    outputDir: string,
    roboflowConfig?: RoboflowConfig,
    logger?: Logger
  );

  async run(): Promise<void>;
  stop(): void;
  async processFrame(frame: cv.Mat): Promise<AnnotatedFrame>;
  getStats(): ProcessingStats;
  getFPS(): number;
  isProcessing(): boolean;
}
```

### WebSocket API

The web interface communicates via WebSocket with the following events:

- `start_processing`: Start video processing
- `stop_processing`: Stop video processing
- `message`: Receive detection results and statistics
- `error`: Receive error messages

## Development

### Building

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

### Adding New Models

1. Create a new model class in `src/models/`
2. Implement the prediction interface
3. Add model loading logic
4. Update the ModelManager class

## Performance Optimization

### Hardware Acceleration
- **GPU**: Install CUDA-enabled OpenCV for GPU acceleration
- **CPU**: Use smaller models for faster CPU processing
- **Memory**: Adjust frame resolution for memory-constrained systems

### Model Selection Guide
- **Speed Priority**: Use YOLOv8 or smaller models
- **Accuracy Priority**: Use COCO or larger models
- **Text Detection**: Use OCR model
- **Custom Tasks**: Use Roboflow custom models

## Troubleshooting

### Common Issues

#### OpenCV Installation
```bash
# macOS
brew install opencv

# Ubuntu/Debian
sudo apt-get install libopencv-dev

# Windows
# Download from https://opencv.org/releases/
```

#### Webcam Access
```bash
# Check webcam permissions
ls /dev/video*

# Test with Node.js
node -e "const cv = require('opencv4nodejs'); console.log(cv.getBuildInformation())"
```

#### Model Loading Errors
- Check internet connection for model downloads
- Verify model name is correct
- Check Roboflow API key

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with TypeScript
4. Add tests
5. Submit pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Open an issue on GitHub
4. Contact the development team 