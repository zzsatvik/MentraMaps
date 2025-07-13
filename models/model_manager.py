"""
Model Manager for AI Video Stream Interpreter
Handles different AI models and Roboflow integration
"""

import cv2
import numpy as np
import logging
from typing import Dict, Any, Optional, Union
from pathlib import Path
import json

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

class ModelManager:
    """Manages different AI models for video processing"""
    
    def __init__(self, 
                 model_name: str = "coco",
                 confidence_threshold: float = 0.5,
                 roboflow_client = None):
        """
        Initialize model manager
        
        Args:
            model_name: Name of the model to use
            confidence_threshold: Minimum confidence for detections
            roboflow_client: Roboflow client instance
        """
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.rf = roboflow_client
        self.logger = logging.getLogger(__name__)
        
        # Initialize model
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the specified model"""
        try:
            if self.model_name.lower() == "coco":
                self._load_coco_model()
            elif self.model_name.lower() == "yolo":
                self._load_yolo_model()
            elif self.model_name.lower() == "ocr":
                self._load_ocr_model()
            elif self.rf is not None:
                self._load_roboflow_model()
            else:
                self.logger.warning(f"Unknown model: {self.model_name}. Using fallback.")
                self._load_fallback_model()
                
        except Exception as e:
            self.logger.error(f"Failed to load model {self.model_name}: {e}")
            self._load_fallback_model()
    
    def _load_coco_model(self):
        """Load COCO model using OpenCV DNN"""
        try:
            # Load COCO model files
            model_path = Path(__file__).parent / "weights"
            model_path.mkdir(exist_ok=True)
            
            # Download model files if not present
            config_file = model_path / "yolov4.cfg"
            weights_file = model_path / "yolov4.weights"
            
            if not config_file.exists() or not weights_file.exists():
                self.logger.info("Downloading COCO model files...")
                self._download_coco_model(model_path)
            
            # Load model
            self.model = cv2.dnn.readNetFromDarknet(str(config_file), str(weights_file))
            
            # Load COCO class names
            self.classes = self._load_coco_classes()
            
            self.logger.info("COCO model loaded successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to load COCO model: {e}")
            raise
    
    def _load_yolo_model(self):
        """Load YOLOv8 model using Ultralytics"""
        if YOLO is None:
            self.logger.error("Ultralytics not available. Install with: pip install ultralytics")
            raise ImportError("Ultralytics not available")
        
        try:
            self.model = YOLO('yolov8n.pt')
            self.logger.info("YOLOv8 model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load YOLOv8 model: {e}")
            raise
    
    def _load_ocr_model(self):
        """Load OCR model for text recognition"""
        try:
            # Use Tesseract OCR
            import pytesseract
            self.model = pytesseract
            self.logger.info("OCR model loaded successfully")
        except ImportError:
            self.logger.error("pytesseract not available. Install with: pip install pytesseract")
            raise
    
    def _load_roboflow_model(self):
        """Load custom model from Roboflow"""
        try:
            # Load model from Roboflow workspace
            workspace = self.rf.workspace()
            project = workspace.project(self.model_name)
            self.model = project.model()
            self.logger.info(f"Roboflow model {self.model_name} loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load Roboflow model: {e}")
            raise
    
    def _load_fallback_model(self):
        """Load a simple fallback model"""
        self.logger.info("Using fallback model")
        self.model = None
    
    def _download_coco_model(self, model_path: Path):
        """Download COCO model files"""
        import urllib.request
        
        config_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4.cfg"
        weights_url = "https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v3_optimal/yolov4.weights"
        
        try:
            # Download config file
            urllib.request.urlretrieve(config_url, model_path / "yolov4.cfg")
            
            # Download weights file (large file)
            self.logger.info("Downloading YOLOv4 weights (this may take a while)...")
            urllib.request.urlretrieve(weights_url, model_path / "yolov4.weights")
            
        except Exception as e:
            self.logger.error(f"Failed to download model files: {e}")
            raise
    
    def _load_coco_classes(self) -> list:
        """Load COCO class names"""
        classes_url = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/data/coco.names"
        
        try:
            import urllib.request
            response = urllib.request.urlopen(classes_url)
            classes = response.read().decode().strip().split('\n')
            return classes
        except Exception as e:
            self.logger.warning(f"Failed to load COCO classes: {e}")
            return []
    
    def predict(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Run prediction on frame
        
        Args:
            frame: Input frame as numpy array
            
        Returns:
            Dictionary containing prediction results
        """
        try:
            if self.model_name.lower() == "coco":
                return self._predict_coco(frame)
            elif self.model_name.lower() == "yolo":
                return self._predict_yolo(frame)
            elif self.model_name.lower() == "ocr":
                return self._predict_ocr(frame)
            elif self.rf is not None:
                return self._predict_roboflow(frame)
            else:
                return self._predict_fallback(frame)
                
        except Exception as e:
            self.logger.error(f"Prediction failed: {e}")
            return {"predictions": [], "error": str(e)}
    
    def _predict_coco(self, frame: np.ndarray) -> Dict[str, Any]:
        """Run COCO model prediction"""
        if self.model is None:
            return {"predictions": []}
        
        try:
            # Prepare input
            blob = cv2.dnn.blobFromImage(frame, 1/255.0, (416, 416), swapRB=True, crop=False)
            self.model.setInput(blob)
            
            # Get output layers
            layer_names = self.model.getLayerNames()
            output_layers = [layer_names[i - 1] for i in self.model.getUnconnectedOutLayers()]
            
            # Forward pass
            outputs = self.model.forward(output_layers)
            
            # Process detections
            predictions = []
            height, width = frame.shape[:2]
            
            for output in outputs:
                for detection in output:
                    scores = detection[5:]
                    class_id = np.argmax(scores)
                    confidence = scores[class_id]
                    
                    if confidence > self.confidence_threshold:
                        center_x = int(detection[0] * width)
                        center_y = int(detection[1] * height)
                        w = int(detection[2] * width)
                        h = int(detection[3] * height)
                        
                        x = center_x - w // 2
                        y = center_y - h // 2
                        
                        predictions.append({
                            "class": self.classes[class_id] if class_id < len(self.classes) else "Unknown",
                            "confidence": float(confidence),
                            "x": center_x / width,
                            "y": center_y / height,
                            "width": w / width,
                            "height": h / height
                        })
            
            return {"predictions": predictions}
            
        except Exception as e:
            self.logger.error(f"COCO prediction failed: {e}")
            return {"predictions": []}
    
    def _predict_yolo(self, frame: np.ndarray) -> Dict[str, Any]:
        """Run YOLOv8 model prediction"""
        if self.model is None:
            return {"predictions": []}
        
        try:
            results = self.model(frame, conf=self.confidence_threshold)
            
            predictions = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().numpy()
                        cls = int(box.cls[0].cpu().numpy())
                        
                        # Convert to normalized coordinates
                        height, width = frame.shape[:2]
                        center_x = (x1 + x2) / 2 / width
                        center_y = (y1 + y2) / 2 / height
                        w = (x2 - x1) / width
                        h = (y2 - y1) / height
                        
                        predictions.append({
                            "class": self.model.names[cls],
                            "confidence": float(conf),
                            "x": center_x,
                            "y": center_y,
                            "width": w,
                            "height": h
                        })
            
            return {"predictions": predictions}
            
        except Exception as e:
            self.logger.error(f"YOLOv8 prediction failed: {e}")
            return {"predictions": []}
    
    def _predict_ocr(self, frame: np.ndarray) -> Dict[str, Any]:
        """Run OCR prediction"""
        if self.model is None:
            return {"predictions": []}
        
        try:
            # Convert to grayscale for better OCR
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Run OCR
            text = self.model.image_to_string(gray)
            
            # Extract text regions
            data = self.model.image_to_data(gray, output_type=self.model.Output.DICT)
            
            predictions = []
            for i, conf in enumerate(data['conf']):
                if conf > self.confidence_threshold * 100:  # OCR confidence is 0-100
                    text_val = data['text'][i]
                    if text_val.strip():
                        x = data['left'][i]
                        y = data['top'][i]
                        w = data['width'][i]
                        h = data['height'][i]
                        
                        # Convert to normalized coordinates
                        height, width = frame.shape[:2]
                        center_x = (x + w/2) / width
                        center_y = (y + h/2) / height
                        
                        predictions.append({
                            "class": "text",
                            "text": text_val,
                            "confidence": conf / 100.0,
                            "x": center_x,
                            "y": center_y,
                            "width": w / width,
                            "height": h / height
                        })
            
            return {"predictions": predictions, "full_text": text}
            
        except Exception as e:
            self.logger.error(f"OCR prediction failed: {e}")
            return {"predictions": []}
    
    def _predict_roboflow(self, frame: np.ndarray) -> Dict[str, Any]:
        """Run Roboflow model prediction"""
        if self.model is None:
            return {"predictions": []}
        
        try:
            # Convert frame to bytes for Roboflow API
            _, buffer = cv2.imencode('.jpg', frame)
            image_bytes = buffer.tobytes()
            
            # Run prediction
            result = self.model.predict(image_bytes, confidence=self.confidence_threshold)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Roboflow prediction failed: {e}")
            return {"predictions": []}
    
    def _predict_fallback(self, frame: np.ndarray) -> Dict[str, Any]:
        """Fallback prediction (no-op)"""
        return {"predictions": [], "message": "No model loaded"} 