/**
 * AI Video Stream Interpreter - Main Class
 * Real-time video analysis using OpenCV and AI models
 */

import cv from 'opencv4nodejs';
import fs from 'fs';
import path from 'path';
import { VideoCapture, FrameProcessor } from './utils/video-utils';
import { ModelManager } from './models/model-manager';
import { Logger } from './utils/logger';
import { 
  Detection, 
  DetectionResult, 
  AnnotatedFrame, 
  ProcessingStats,
  RoboflowConfig 
} from './types';

export class VideoInterpreter {
  private source: string | number;
  private modelName: string;
  private confidenceThreshold: number;
  private outputDir: string;
  private logger: Logger;
  private videoCapture: VideoCapture;
  private modelManager: ModelManager;
  private roboflowConfig?: RoboflowConfig;

  // Processing state
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private fps: number = 0;
  private lastFpsTime: number = Date.now();
  private stats: ProcessingStats = {
    fps: 0,
    totalDetections: 0,
    classDistribution: {},
    processingTime: 0
  };

  constructor(
    source: string | number = '0',
    modelName: string = 'coco',
    confidenceThreshold: number = 0.5,
    outputDir: string = './output',
    roboflowConfig?: RoboflowConfig,
    logger?: Logger
  ) {
    this.source = source;
    this.modelName = modelName;
    this.confidenceThreshold = confidenceThreshold;
    this.outputDir = outputDir;
    this.roboflowConfig = roboflowConfig;
    this.logger = logger || new Logger('video_interpreter');

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    this.initializeComponents();
  }

  private initializeComponents(): void {
    try {
      // Initialize video capture
      this.videoCapture = new VideoCapture(this.source, this.logger);

      // Initialize model manager
      this.modelManager = new ModelManager(
        this.modelName,
        this.confidenceThreshold,
        this.roboflowConfig,
        this.logger
      );

      this.logger.info('Video interpreter initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize video interpreter: ${error}`);
      throw error;
    }
  }

  async processFrame(frame: cv.Mat): Promise<AnnotatedFrame> {
    const startTime = Date.now();

    try {
      // Run AI prediction
      const detections = await this.modelManager.predict(frame);

      // Annotate frame with detections
      const annotatedFrame = this.annotateFrame(frame, detections);

      // Update statistics
      this.updateStats(detections, Date.now() - startTime);

      return {
        frame: FrameProcessor.encodeToJPEG(annotatedFrame),
        detections: detections.predictions,
        fps: this.fps,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error(`Error processing frame: ${error}`);
      return {
        frame: FrameProcessor.encodeToJPEG(frame),
        detections: [],
        fps: this.fps,
        timestamp: Date.now()
      };
    }
  }

  private annotateFrame(frame: cv.Mat, detections: DetectionResult): cv.Mat {
    const annotatedFrame = frame.copy();

    if (detections.predictions) {
      for (const prediction of detections.predictions) {
        if (prediction.confidence >= this.confidenceThreshold) {
          // Convert normalized coordinates to pixel coordinates
          const { width, height } = this.videoCapture.getFrameSize();
          const x1 = Math.round((prediction.x - prediction.width / 2) * width);
          const y1 = Math.round((prediction.y - prediction.height / 2) * height);
          const x2 = Math.round((prediction.x + prediction.width / 2) * width);
          const y2 = Math.round((prediction.y + prediction.height / 2) * height);

          // Draw bounding box
          FrameProcessor.drawRectangle(
            annotatedFrame,
            x1, y1, x2, y2,
            new cv.Vec3(0, 255, 0),
            2
          );

          // Add label
          const label = `${prediction.class} ${prediction.confidence.toFixed(2)}`;
          FrameProcessor.drawText(
            annotatedFrame,
            label,
            new cv.Point2(x1, y1 - 10),
            0.5,
            new cv.Vec3(0, 255, 0),
            2
          );
        }
      }
    }

    // Add FPS counter
    FrameProcessor.drawText(
      annotatedFrame,
      `FPS: ${this.fps.toFixed(1)}`,
      new cv.Point2(10, 30),
      1,
      new cv.Vec3(0, 255, 0),
      2
    );

    return annotatedFrame;
  }

  private updateStats(detections: DetectionResult, processingTime: number): void {
    this.frameCount++;
    const currentTime = Date.now();

    // Update FPS
    if (currentTime - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount / ((currentTime - this.lastFpsTime) / 1000);
      this.frameCount = 0;
      this.lastFpsTime = currentTime;
    }

    // Update detection statistics
    if (detections.predictions) {
      this.stats.totalDetections += detections.predictions.length;
      this.stats.processingTime = processingTime;

      // Update class distribution
      for (const detection of detections.predictions) {
        this.stats.classDistribution[detection.class] = 
          (this.stats.classDistribution[detection.class] || 0) + 1;
      }
    }
  }

  async saveDetection(frame: cv.Mat, detections: DetectionResult): Promise<void> {
    if (!detections.predictions || detections.predictions.length === 0) {
      return;
    }

    try {
      const timestamp = Date.now();
      const framePath = path.join(this.outputDir, `detection_${timestamp}.jpg`);
      const metadataPath = path.join(this.outputDir, `detection_${timestamp}.json`);

      // Save frame
      cv.imwrite(framePath, frame);

      // Save metadata
      const metadata = {
        timestamp,
        detections: detections.predictions,
        model: this.modelName,
        confidence_threshold: this.confidenceThreshold
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      this.logger.info(`Detection saved: ${framePath}`);
    } catch (error) {
      this.logger.error(`Failed to save detection: ${error}`);
    }
  }

  async run(): Promise<void> {
    this.isRunning = true;
    this.logger.info('Starting video stream processing...');

    try {
      while (this.isRunning) {
        const { success, frame } = this.videoCapture.read();
        
        if (!success || !frame) {
          this.logger.warn('Failed to read frame');
          continue;
        }

        // Process frame
        const annotatedFrame = await this.processFrame(frame);

        // Save detections if enabled
        if (process.env.SAVE_DETECTIONS === 'true') {
          await this.saveDetection(frame, { predictions: annotatedFrame.detections });
        }

        // Display frame (in a real implementation, you'd send to a display)
        // For now, we'll just log the detections
        if (annotatedFrame.detections.length > 0) {
          this.logger.info(`Detected ${annotatedFrame.detections.length} objects`);
        }

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 33)); // ~30 FPS
      }
    } catch (error) {
      this.logger.error(`Error in processing loop: ${error}`);
    } finally {
      this.cleanup();
    }
  }

  stop(): void {
    this.isRunning = false;
    this.logger.info('Stopping video processing...');
  }

  private cleanup(): void {
    this.isRunning = false;
    this.videoCapture.release();
    this.logger.info('Cleanup completed');
  }

  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  getFPS(): number {
    return this.fps;
  }

  isProcessing(): boolean {
    return this.isRunning;
  }
} 