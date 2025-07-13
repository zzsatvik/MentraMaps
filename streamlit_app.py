"""
Streamlit Web Interface for AI Video Stream Interpreter
"""

import streamlit as st
import cv2
import numpy as np
import time
import os
from pathlib import Path
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
import sys
sys.path.append(str(Path(__file__).parent))

from video_interpreter import VideoInterpreter
from utils.logger import setup_logger

def main():
    """Main Streamlit application"""
    st.set_page_config(
        page_title="AI Video Stream Interpreter",
        page_icon="🎥",
        layout="wide"
    )
    
    st.title("🎥 AI Video Stream Interpreter")
    st.markdown("Real-time video analysis using Roboflow and OpenCV")
    
    # Sidebar configuration
    with st.sidebar:
        st.header("Configuration")
        
        # Video source selection
        source_options = {
            "Webcam": "0",
            "File Upload": "upload",
            "RTSP Stream": "rtsp"
        }
        source_type = st.selectbox("Video Source", list(source_options.keys()))
        
        if source_type == "File Upload":
            uploaded_file = st.file_uploader("Upload Video File", type=['mp4', 'avi', 'mov'])
            source = uploaded_file.name if uploaded_file else "0"
        elif source_type == "RTSP Stream":
            rtsp_url = st.text_input("RTSP URL", "rtsp://")
            source = rtsp_url if rtsp_url != "rtsp://" else "0"
        else:
            source = "0"
        
        # Model selection
        model_options = ["coco", "yolo", "ocr"]
        selected_model = st.selectbox("AI Model", model_options)
        
        # Confidence threshold
        confidence = st.slider("Confidence Threshold", 0.0, 1.0, 0.5, 0.1)
        
        # Additional options
        save_detections = st.checkbox("Save Detections", value=False)
        show_fps = st.checkbox("Show FPS", value=True)
        
        # Start/Stop button
        start_button = st.button("Start Processing", type="primary")
        stop_button = st.button("Stop Processing")
    
    # Main content area
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.header("Live Video Stream")
        
        # Video display placeholder
        video_placeholder = st.empty()
        
        # Detection results placeholder
        results_placeholder = st.empty()
    
    with col2:
        st.header("Detection Results")
        
        # Statistics
        stats_placeholder = st.empty()
        
        # Recent detections
        detections_placeholder = st.empty()
    
    # Initialize video interpreter
    if 'interpreter' not in st.session_state:
        st.session_state.interpreter = None
        st.session_state.is_running = False
        st.session_state.detection_history = []
    
    # Handle start/stop
    if start_button and not st.session_state.is_running:
        try:
            st.session_state.interpreter = VideoInterpreter(
                source=source,
                model=selected_model,
                confidence_threshold=confidence,
                output_dir="./output"
            )
            st.session_state.is_running = True
            st.success("Video processing started!")
        except Exception as e:
            st.error(f"Failed to start processing: {e}")
    
    if stop_button and st.session_state.is_running:
        if st.session_state.interpreter:
            st.session_state.interpreter.stop()
        st.session_state.is_running = False
        st.success("Video processing stopped!")
    
    # Main processing loop
    if st.session_state.is_running and st.session_state.interpreter:
        try:
            # Read frame
            ret, frame = st.session_state.interpreter.video_source.read()
            
            if ret:
                # Process frame
                annotated_frame, detections = st.session_state.interpreter.process_frame(frame)
                
                # Convert BGR to RGB for display
                rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
                
                # Display video
                video_placeholder.image(rgb_frame, channels="RGB", use_column_width=True)
                
                # Update detection results
                if detections and 'predictions' in detections:
                    st.session_state.detection_history.extend(detections['predictions'])
                    
                    # Keep only recent detections
                    if len(st.session_state.detection_history) > 50:
                        st.session_state.detection_history = st.session_state.detection_history[-50:]
                    
                    # Display statistics
                    with stats_placeholder.container():
                        st.metric("Total Detections", len(st.session_state.detection_history))
                        st.metric("Current FPS", f"{st.session_state.interpreter.fps:.1f}")
                        
                        # Class distribution
                        if st.session_state.detection_history:
                            class_counts = {}
                            for detection in st.session_state.detection_history:
                                class_name = detection.get('class', 'Unknown')
                                class_counts[class_name] = class_counts.get(class_name, 0) + 1
                            
                            st.write("**Class Distribution:**")
                            for class_name, count in class_counts.items():
                                st.write(f"- {class_name}: {count}")
                    
                    # Display recent detections
                    with detections_placeholder.container():
                        st.write("**Recent Detections:**")
                        for detection in st.session_state.detection_history[-10:]:
                            confidence = detection.get('confidence', 0)
                            class_name = detection.get('class', 'Unknown')
                            st.write(f"- {class_name} ({confidence:.2f})")
                
                # Save detections if enabled
                if save_detections and detections:
                    st.session_state.interpreter.save_detection(annotated_frame, detections)
            
            # Small delay to prevent overwhelming
            time.sleep(0.03)
            
        except Exception as e:
            st.error(f"Processing error: {e}")
            st.session_state.is_running = False
    
    # Instructions
    if not st.session_state.is_running:
        st.info("""
        **Instructions:**
        1. Configure your video source and model in the sidebar
        2. Click 'Start Processing' to begin real-time analysis
        3. View detection results in the sidebar
        4. Click 'Stop Processing' to end the session
        
        **Supported Models:**
        - **COCO**: General object detection
        - **YOLOv8**: Fast and accurate object detection
        - **OCR**: Text recognition in video
        
        **Keyboard Shortcuts (when processing):**
        - Press 'q' to quit
        - Press 's' to save current frame
        """)

if __name__ == "__main__":
    main() 