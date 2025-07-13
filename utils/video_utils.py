"""
Video utilities for AI Video Stream Interpreter
"""

import cv2
import numpy as np
from typing import Tuple, Optional, Union
from pathlib import Path
import logging

class VideoSource:
    """Handles different video sources (webcam, file, RTSP)"""
    
    def __init__(self, source: Union[str, int]):
        """
        Initialize video source
        
        Args:
            source: Video source (webcam index, file path, or RTSP URL)
        """
        self.source = source
        self.cap = None
        self.logger = logging.getLogger(__name__)
        
        self._init_capture()
    
    def _init_capture(self):
        """Initialize video capture"""
        try:
            # Try to convert to int for webcam
            if isinstance(self.source, str) and self.source.isdigit():
                self.cap = cv2.VideoCapture(int(self.source))
            else:
                self.cap = cv2.VideoCapture(self.source)
            
            if not self.cap.isOpened():
                raise ValueError(f"Failed to open video source: {self.source}")
            
            # Set properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.logger.info(f"Video source initialized: {self.source}")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize video source: {e}")
            raise
    
    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """
        Read a frame from the video source
        
        Returns:
            Tuple of (success, frame)
        """
        if self.cap is None:
            return False, None
        
        ret, frame = self.cap.read()
        return ret, frame
    
    def get_frame_size(self) -> Tuple[int, int]:
        """Get frame dimensions"""
        if self.cap is None:
            return (0, 0)
        
        width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        return (width, height)
    
    def get_fps(self) -> float:
        """Get frame rate"""
        if self.cap is None:
            return 0.0
        
        return self.cap.get(cv2.CAP_PROP_FPS)
    
    def release(self):
        """Release video capture resources"""
        if self.cap is not None:
            self.cap.release()
            self.cap = None

class FrameProcessor:
    """Utility class for frame processing operations"""
    
    @staticmethod
    def resize_frame(frame: np.ndarray, width: int, height: int) -> np.ndarray:
        """Resize frame to specified dimensions"""
        return cv2.resize(frame, (width, height))
    
    @staticmethod
    def crop_frame(frame: np.ndarray, x: int, y: int, width: int, height: int) -> np.ndarray:
        """Crop frame to specified region"""
        return frame[y:y+height, x:x+width]
    
    @staticmethod
    def convert_to_rgb(frame: np.ndarray) -> np.ndarray:
        """Convert BGR frame to RGB"""
        return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    @staticmethod
    def convert_to_bgr(frame: np.ndarray) -> np.ndarray:
        """Convert RGB frame to BGR"""
        return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    
    @staticmethod
    def apply_blur(frame: np.ndarray, kernel_size: int = 5) -> np.ndarray:
        """Apply Gaussian blur to frame"""
        return cv2.GaussianBlur(frame, (kernel_size, kernel_size), 0)
    
    @staticmethod
    def apply_grayscale(frame: np.ndarray) -> np.ndarray:
        """Convert frame to grayscale"""
        return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    @staticmethod
    def draw_text(frame: np.ndarray, text: str, position: Tuple[int, int], 
                  font_scale: float = 1.0, color: Tuple[int, int, int] = (0, 255, 0),
                  thickness: int = 2) -> np.ndarray:
        """Draw text on frame"""
        cv2.putText(frame, text, position, cv2.FONT_HERSHEY_SIMPLEX, 
                   font_scale, color, thickness)
        return frame
    
    @staticmethod
    def draw_rectangle(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int,
                       color: Tuple[int, int, int] = (0, 255, 0), 
                       thickness: int = 2) -> np.ndarray:
        """Draw rectangle on frame"""
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
        return frame 