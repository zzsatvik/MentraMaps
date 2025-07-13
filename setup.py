#!/usr/bin/env python3
"""
Setup script for AI Video Stream Interpreter
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)

def setup_environment():
    """Setup environment variables"""
    print("🔧 Setting up environment...")
    
    env_file = Path(".env")
    if not env_file.exists():
        print("📝 Creating .env file...")
        
        env_content = """# Roboflow API Configuration
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
"""
        
        with open(env_file, "w") as f:
            f.write(env_content)
        
        print("✅ .env file created")
        print("⚠️  Please update ROBOFLOW_API_KEY in .env file")
    else:
        print("✅ .env file already exists")

def check_system_requirements():
    """Check system requirements"""
    print("🔍 Checking system requirements...")
    
    # Check for Tesseract (for OCR)
    try:
        subprocess.run(["tesseract", "--version"], capture_output=True, check=True)
        print("✅ Tesseract OCR found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  Tesseract OCR not found")
        print("   Install Tesseract for OCR functionality:")
        if platform.system() == "Darwin":  # macOS
            print("   brew install tesseract")
        elif platform.system() == "Linux":
            print("   sudo apt-get install tesseract-ocr")
        elif platform.system() == "Windows":
            print("   Download from: https://github.com/UB-Mannheim/tesseract/wiki")
    
    # Check for webcam access
    try:
        import cv2
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            print("✅ Webcam access available")
            cap.release()
        else:
            print("⚠️  Webcam access not available")
    except ImportError:
        print("⚠️  OpenCV not available")

def create_directories():
    """Create necessary directories"""
    print("📁 Creating directories...")
    
    directories = ["output", "models/weights"]
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directories created")

def run_tests():
    """Run basic tests"""
    print("🧪 Running basic tests...")
    
    try:
        # Test imports
        import cv2
        import numpy as np
        import streamlit
        print("✅ Core imports successful")
        
        # Test video interpreter
        from video_interpreter import VideoInterpreter
        print("✅ Video interpreter import successful")
        
        # Test model manager
        from models.model_manager import ModelManager
        print("✅ Model manager import successful")
        
        print("✅ All tests passed")
        
    except ImportError as e:
        print(f"❌ Import test failed: {e}")
        return False
    
    return True

def main():
    """Main setup function"""
    print("🎥 AI Video Stream Interpreter - Setup")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Install dependencies
    install_dependencies()
    
    # Setup environment
    setup_environment()
    
    # Check system requirements
    check_system_requirements()
    
    # Create directories
    create_directories()
    
    # Run tests
    if run_tests():
        print("\n🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Update ROBOFLOW_API_KEY in .env file")
        print("2. Run demo: python demo.py")
        print("3. Run web interface: streamlit run streamlit_app.py")
        print("4. Run command line: python main.py --source 0 --model coco")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 