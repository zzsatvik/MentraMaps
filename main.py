#!/usr/bin/env python3
"""
AI Video Stream Interpreter - Main Application
Real-time video analysis using Roboflow and OpenCV
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from video_interpreter import VideoInterpreter
from utils.logger import setup_logger

def main():
    """Main application entry point"""
    # Load environment variables
    load_dotenv()
    
    # Setup logging
    logger = setup_logger()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='AI Video Stream Interpreter')
    parser.add_argument('--source', type=str, default=os.getenv('DEFAULT_SOURCE', '0'),
                       help='Video source (0 for webcam, file path, or RTSP URL)')
    parser.add_argument('--model', type=str, default=os.getenv('DEFAULT_MODEL', 'coco'),
                       help='Model to use for inference')
    parser.add_argument('--confidence', type=float, 
                       default=float(os.getenv('CONFIDENCE_THRESHOLD', '0.5')),
                       help='Confidence threshold for detections')
    parser.add_argument('--output', type=str, default=os.getenv('OUTPUT_DIR', './output'),
                       help='Output directory for saved detections')
    parser.add_argument('--web', action='store_true', help='Launch web interface')
    
    args = parser.parse_args()
    
    try:
        # Initialize video interpreter
        interpreter = VideoInterpreter(
            source=args.source,
            model=args.model,
            confidence_threshold=args.confidence,
            output_dir=args.output
        )
        
        if args.web:
            # Launch web interface
            import streamlit_app
            streamlit_app.run()
        else:
            # Run command line interface
            interpreter.run()
            
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.error(f"Application error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 