#!/usr/bin/env python3
"""
Demo script for AI Video Stream Interpreter
Simple demonstration of the video processing capabilities
"""

import cv2
import numpy as np
import time
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
import sys
sys.path.append(str(Path(__file__).parent))

from video_interpreter import VideoInterpreter
from utils.logger import setup_logger

def create_test_video():
    """Create a simple test video for demonstration"""
    output_path = "test_video.mp4"
    
    if os.path.exists(output_path):
        return output_path
    
    # Create a simple test video
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, 20.0, (640, 480))
    
    for i in range(100):  # 5 seconds at 20 fps
        # Create a frame with moving shapes
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Draw moving rectangle
        x = int(50 + 30 * np.sin(i * 0.1))
        y = int(240 + 30 * np.cos(i * 0.1))
        cv2.rectangle(frame, (x, y), (x + 100, y + 100), (0, 255, 0), -1)
        
        # Draw moving circle
        cx = int(400 + 50 * np.cos(i * 0.15))
        cy = int(240 + 50 * np.sin(i * 0.15))
        cv2.circle(frame, (cx, cy), 50, (255, 0, 0), -1)
        
        # Add text
        cv2.putText(frame, f"Frame {i}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        out.write(frame)
    
    out.release()
    return output_path

def demo_webcam():
    """Demo with webcam"""
    print("Starting webcam demo...")
    print("Press 'q' to quit, 's' to save snapshot")
    
    try:
        interpreter = VideoInterpreter(
            source="0",  # Webcam
            model="coco",
            confidence_threshold=0.5
        )
        interpreter.run()
    except Exception as e:
        print(f"Demo failed: {e}")

def demo_video_file():
    """Demo with video file"""
    print("Creating test video...")
    video_path = create_test_video()
    
    print(f"Starting video file demo with: {video_path}")
    print("Press 'q' to quit, 's' to save snapshot")
    
    try:
        interpreter = VideoInterpreter(
            source=video_path,
            model="coco",
            confidence_threshold=0.5
        )
        interpreter.run()
    except Exception as e:
        print(f"Demo failed: {e}")

def demo_ocr():
    """Demo OCR capabilities"""
    print("Starting OCR demo...")
    print("This will attempt to read text from video")
    
    try:
        interpreter = VideoInterpreter(
            source="0",  # Webcam
            model="ocr",
            confidence_threshold=0.3
        )
        interpreter.run()
    except Exception as e:
        print(f"OCR demo failed: {e}")

def main():
    """Main demo function"""
    print("🎥 AI Video Stream Interpreter - Demo")
    print("=" * 50)
    
    # Setup logging
    logger = setup_logger()
    
    # Demo options
    print("\nSelect demo type:")
    print("1. Webcam demo (COCO model)")
    print("2. Video file demo (COCO model)")
    print("3. OCR demo (Text recognition)")
    print("4. Exit")
    
    while True:
        try:
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == "1":
                demo_webcam()
                break
            elif choice == "2":
                demo_video_file()
                break
            elif choice == "3":
                demo_ocr()
                break
            elif choice == "4":
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please enter 1-4.")
                
        except KeyboardInterrupt:
            print("\nDemo interrupted by user")
            break
        except Exception as e:
            logger.error(f"Demo error: {e}")
            print(f"Demo error: {e}")

if __name__ == "__main__":
    main() 