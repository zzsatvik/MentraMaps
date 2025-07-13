"""
AI Video Stream Interpreter
Core video processing logic with Roboflow integration
"""

import cv2
import numpy as np
import time
import os
from typing import Optional, Dict, Any, Tuple
from pathlib import Path
import logging

from roboflow import Roboflow
from utils.logger import setup_logger
from utils.video_utils import VideoSource, FrameProcessor
from models.model_manager import ModelManager

class VideoInterpreter:
    """Main class for AI video stream interpretation"""
    
    def __init__(self, 
                 source: str = "0",
                 model: str = "coco",
                 confidence_threshold: float = 0.5,
                 output_dir: str = "./output"):
        """
        Initialize the video interpreter
        
        Args:
            source: Video source (webcam index, file path, or RTSP URL)
            model: Model name to use for inference
            confidence_threshold: Minimum confidence for detections
            output_dir: Directory to save detection results
        """
        self.source = source
        self.model = model
        self.confidence_threshold = confidence_threshold
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Setup logging
        self.logger = setup_logger()
        
        # Initialize components
        self._init_roboflow()
        self._init_video_source()
        self._init_model_manager()
        
        # Processing state
        self.is_running = False
        self.frame_count = 0
        self.fps = 0
        self.last_fps_time = time.time()
        
    def _init_roboflow(self):
        """Initialize Roboflow client"""
        try:
            api_key = os.getenv('ROBOFLOW_API_KEY')
            if not api_key:
                self.logger.warning("ROBOFLOW_API_KEY not found. Some features may be limited.")
                self.rf = None
            else:
                self.rf = Roboflow(api_key=api_key)
                self.logger.info("Roboflow client initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize Roboflow: {e}")
            self.rf = None
    
    def _init_video_source(self):
        """Initialize video source"""
        try:
            self.video_source = VideoSource(self.source)
            self.logger.info(f"Video source initialized: {self.source}")
        except Exception as e:
            self.logger.error(f"Failed to initialize video source: {e}")
            raise
    
    def _init_model_manager(self):
        """Initialize model manager"""
        try:
            self.model_manager = ModelManager(
                model_name=self.model,
                confidence_threshold=self.confidence_threshold,
                roboflow_client=self.rf
            )
            self.logger.info(f"Model manager initialized with model: {self.model}")
        except Exception as e:
            self.logger.error(f"Failed to initialize model manager: {e}")
            raise
    
    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Process a single frame and return annotated frame with detection results
        
        Args:
            frame: Input frame as numpy array
            
        Returns:
            Tuple of (annotated_frame, detection_results)
        """
        try:
            # Run inference
            detections = self.model_manager.predict(frame)
            
            # Annotate frame with detections
            annotated_frame = self._annotate_frame(frame, detections)
            
            # Update FPS
            self._update_fps()
            
            return annotated_frame, detections
            
        except Exception as e:
            self.logger.error(f"Error processing frame: {e}")
            return frame, {}
    
    def _annotate_frame(self, frame: np.ndarray, detections: Dict[str, Any]) -> np.ndarray:
        """Annotate frame with detection results"""
        annotated_frame = frame.copy()
        
        if 'predictions' in detections:
            for prediction in detections['predictions']:
                if prediction.get('confidence', 0) >= self.confidence_threshold:
                    # Extract bounding box
                    x = prediction.get('x', 0)
                    y = prediction.get('y', 0)
                    width = prediction.get('width', 0)
                    height = prediction.get('height', 0)
                    
                    # Convert to pixel coordinates
                    img_height, img_width = frame.shape[:2]
                    x1 = int((x - width/2) * img_width)
                    y1 = int((y - height/2) * img_height)
                    x2 = int((x + width/2) * img_width)
                    y2 = int((y + height/2) * img_height)
                    
                    # Draw bounding box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    # Add label
                    label = f"{prediction.get('class', 'Unknown')} {prediction.get('confidence', 0):.2f}"
                    cv2.putText(annotated_frame, label, (x1, y1-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Add FPS counter
        cv2.putText(annotated_frame, f"FPS: {self.fps:.1f}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        return annotated_frame
    
    def _update_fps(self):
        """Update FPS calculation"""
        self.frame_count += 1
        current_time = time.time()
        
        if current_time - self.last_fps_time >= 1.0:
            self.fps = self.frame_count / (current_time - self.last_fps_time)
            self.frame_count = 0
            self.last_fps_time = current_time
    
    def save_detection(self, frame: np.ndarray, detections: Dict[str, Any]):
        """Save detection results to output directory"""
        if not detections:
            return
            
        timestamp = int(time.time())
        frame_path = self.output_dir / f"detection_{timestamp}.jpg"
        cv2.imwrite(str(frame_path), frame)
        
        # Save detection metadata
        metadata_path = self.output_dir / f"detection_{timestamp}.json"
        import json
        with open(metadata_path, 'w') as f:
            json.dump(detections, f, indent=2)
    
    def run(self):
        """Main processing loop"""
        self.is_running = True
        self.logger.info("Starting video stream processing...")
        
        try:
            while self.is_running:
                # Read frame
                ret, frame = self.video_source.read()
                if not ret:
                    self.logger.warning("Failed to read frame")
                    continue
                
                # Process frame
                annotated_frame, detections = self.process_frame(frame)
                
                # Save detections if enabled
                if os.getenv('SAVE_DETECTIONS', 'false').lower() == 'true':
                    self.save_detection(annotated_frame, detections)
                
                # Display frame
                cv2.imshow('AI Video Stream Interpreter', annotated_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    # Save current frame
                    timestamp = int(time.time())
                    cv2.imwrite(f"snapshot_{timestamp}.jpg", annotated_frame)
                    self.logger.info(f"Saved snapshot: snapshot_{timestamp}.jpg")
        
        except KeyboardInterrupt:
            self.logger.info("Processing stopped by user")
        except Exception as e:
            self.logger.error(f"Error in processing loop: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        self.is_running = False
        if hasattr(self, 'video_source'):
            self.video_source.release()
        cv2.destroyAllWindows()
        self.logger.info("Cleanup completed")
    
    def stop(self):
        """Stop the processing loop"""
        self.is_running = False 