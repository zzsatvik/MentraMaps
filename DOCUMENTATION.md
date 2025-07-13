# AI Video Stream Interpreter - Documentation

## Overview

The AI Video Stream Interpreter is a comprehensive real-time video analysis system that leverages Roboflow's AI capabilities and OpenCV for processing video streams. It supports multiple AI models, various video sources, and provides both command-line and web interfaces.

## Features

### Core Capabilities
- **Real-time Video Processing**: Process video streams with minimal latency
- **Multiple AI Models**: Support for COCO, YOLOv8, OCR, and custom Roboflow models
- **Flexible Video Sources**: Webcam, video files, RTSP streams, and file uploads
- **Detection Visualization**: Real-time bounding boxes and labels
- **Performance Monitoring**: FPS tracking and performance metrics
- **Detection Storage**: Save detection results and metadata

### Supported Models

#### 1. COCO Model (Object Detection)
- **Description**: General-purpose object detection using YOLOv4
- **Classes**: 80 common objects (person, car, dog, etc.)
- **Use Case**: General object detection and tracking
- **Performance**: Good balance of speed and accuracy

#### 2. YOLOv8 Model (Object Detection)
- **Description**: Latest YOLO model for fast object detection
- **Classes**: 80 common objects
- **Use Case**: High-speed object detection
- **Performance**: Fastest among supported models

#### 3. OCR Model (Text Recognition)
- **Description**: Optical Character Recognition for text detection
- **Use Case**: Reading text from video streams
- **Requirements**: Tesseract OCR installation
- **Performance**: Moderate speed, high accuracy for clear text

#### 4. Custom Roboflow Models
- **Description**: User-trained models from Roboflow platform
- **Use Case**: Specialized detection tasks
- **Setup**: Requires Roboflow API key and model name
- **Performance**: Varies based on model complexity

## Installation

### Prerequisites
- Python 3.8 or higher
- Webcam or video source
- Tesseract OCR (for OCR functionality)

### Quick Setup
```bash
# Clone or download the project
cd ai-video-stream-interpreter

# Run setup script
python setup.py

# Or install manually
pip install -r requirements.txt
```

### System Dependencies

#### macOS
```bash
# Install Tesseract
brew install tesseract

# Install OpenCV dependencies
brew install opencv
```

#### Ubuntu/Debian
```bash
# Install Tesseract
sudo apt-get install tesseract-ocr

# Install OpenCV dependencies
sudo apt-get install libopencv-dev python3-opencv
```

#### Windows
- Download Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
- Install OpenCV: `pip install opencv-python`

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
LOG_LEVEL=INFO
```

### Getting Roboflow API Key
1. Sign up at [Roboflow](https://roboflow.com)
2. Go to your workspace
3. Navigate to API settings
4. Copy your API key
5. Add it to the `.env` file

## Usage

### Command Line Interface

#### Basic Usage
```bash
# Webcam with COCO model
python main.py --source 0 --model coco

# Video file with YOLOv8
python main.py --source video.mp4 --model yolo

# RTSP stream with OCR
python main.py --source rtsp://camera-ip:554/stream --model ocr

# Custom confidence threshold
python main.py --source 0 --model coco --confidence 0.7
```

#### Command Line Options
- `--source`: Video source (0 for webcam, file path, or RTSP URL)
- `--model`: AI model to use (coco, yolo, ocr, or custom)
- `--confidence`: Confidence threshold (0.0 to 1.0)
- `--output`: Output directory for saved detections
- `--web`: Launch web interface instead of command line

### Web Interface

#### Launch Web Interface
```bash
streamlit run streamlit_app.py
```

#### Web Interface Features
- **Real-time Video Display**: Live video stream with detections
- **Model Selection**: Choose from available AI models
- **Configuration Panel**: Adjust confidence threshold and other settings
- **Detection Statistics**: Real-time detection counts and class distribution
- **Detection History**: View recent detections with confidence scores
- **Save Options**: Enable/disable detection saving

### Demo Script

#### Interactive Demo
```bash
python demo.py
```

#### Demo Options
1. **Webcam Demo**: Test with live webcam feed
2. **Video File Demo**: Test with generated test video
3. **OCR Demo**: Test text recognition capabilities

## API Reference

### VideoInterpreter Class

#### Constructor
```python
VideoInterpreter(
    source="0",                    # Video source
    model="coco",                  # AI model
    confidence_threshold=0.5,      # Detection confidence
    output_dir="./output"          # Output directory
)
```

#### Methods
- `run()`: Start video processing loop
- `stop()`: Stop processing
- `process_frame(frame)`: Process single frame
- `save_detection(frame, detections)`: Save detection results

### ModelManager Class

#### Constructor
```python
ModelManager(
    model_name="coco",             # Model name
    confidence_threshold=0.5,      # Confidence threshold
    roboflow_client=None           # Roboflow client
)
```

#### Methods
- `predict(frame)`: Run inference on frame
- `_load_model()`: Load specified model

## Advanced Usage

### Custom Roboflow Models

#### Setup Custom Model
1. Train your model on Roboflow
2. Get your API key and model name
3. Update `.env` file with API key
4. Use model name in command line or web interface

#### Example
```bash
python main.py --source 0 --model your-custom-model-name
```

### RTSP Stream Processing

#### Setup RTSP Camera
1. Get your camera's RTSP URL
2. Use the URL as source parameter

#### Example
```bash
python main.py --source rtsp://192.168.1.100:554/stream1 --model coco
```

### Batch Processing

#### Process Multiple Videos
```bash
for video in *.mp4; do
    python main.py --source "$video" --model coco --output "./results/$video"
done
```

## Performance Optimization

### Hardware Acceleration
- **GPU**: Install CUDA-enabled PyTorch for GPU acceleration
- **CPU**: Use smaller models (YOLOv8n) for faster CPU processing
- **Memory**: Adjust frame resolution for memory-constrained systems

### Model Selection Guide
- **Speed Priority**: Use YOLOv8 or smaller models
- **Accuracy Priority**: Use COCO or larger models
- **Text Detection**: Use OCR model
- **Custom Tasks**: Use Roboflow custom models

### Performance Tips
1. Lower resolution for faster processing
2. Increase confidence threshold to reduce false positives
3. Use appropriate model for your use case
4. Close unnecessary applications to free up resources

## Troubleshooting

### Common Issues

#### Webcam Not Working
```bash
# Check webcam permissions
ls /dev/video*

# Test with OpenCV
python -c "import cv2; cap = cv2.VideoCapture(0); print(cap.isOpened())"
```

#### Model Loading Errors
```bash
# Clear model cache
rm -rf models/weights/*

# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

#### OCR Not Working
```bash
# Check Tesseract installation
tesseract --version

# Install language packs if needed
sudo apt-get install tesseract-ocr-eng
```

#### Performance Issues
1. Reduce frame resolution
2. Use smaller models
3. Increase confidence threshold
4. Close other applications

### Error Messages

#### "Failed to open video source"
- Check if source exists and is accessible
- Verify webcam permissions
- Test with different source index

#### "Model loading failed"
- Check internet connection for model downloads
- Verify model name is correct
- Check Roboflow API key

#### "OCR not available"
- Install Tesseract OCR
- Check Tesseract installation path
- Install language packs

## Development

### Project Structure
```
ai-video-stream-interpreter/
├── main.py                 # Main application
├── video_interpreter.py    # Core processing logic
├── streamlit_app.py       # Web interface
├── demo.py                # Demo script
├── setup.py               # Setup script
├── requirements.txt       # Dependencies
├── models/
│   ├── __init__.py
│   └── model_manager.py   # Model management
├── utils/
│   ├── __init__.py
│   ├── logger.py          # Logging utilities
│   └── video_utils.py     # Video utilities
├── output/                # Detection outputs
└── README.md             # Project documentation
```

### Adding New Models

#### Custom Model Integration
1. Create new model class in `models/`
2. Implement `predict()` method
3. Add model loading logic
4. Update model selection in `ModelManager`

#### Example Custom Model
```python
class CustomModel:
    def __init__(self, confidence_threshold=0.5):
        self.confidence_threshold = confidence_threshold
        # Load your model here
    
    def predict(self, frame):
        # Implement prediction logic
        return {"predictions": [...]}
```

### Contributing
1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Open an issue on GitHub
4. Contact the development team

## Changelog

### Version 1.0.0
- Initial release
- Support for COCO, YOLOv8, and OCR models
- Web interface with Streamlit
- Command line interface
- Real-time video processing
- Detection visualization and storage 