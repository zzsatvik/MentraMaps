/**
 * Video utilities for AI Video Stream Interpreter
 */

import cv from 'opencv4nodejs';
import { VideoSource, FrameData } from '../types';

export class VideoCapture {
  private cap: cv.VideoCapture | null = null;
  private source: string | number;
  private logger: any;

  constructor(source: string | number, logger?: any) {
    this.source = source;
    this.logger = logger;
    this.initCapture();
  }

  private initCapture(): void {
    try {
      // Convert source to appropriate type
      const sourceValue = typeof this.source === 'string' && !isNaN(Number(this.source)) 
        ? Number(this.source) 
        : this.source;

      this.cap = new cv.VideoCapture(sourceValue as any);
      
      if (!this.cap.isOpened()) {
        throw new Error(`Failed to open video source: ${this.source}`);
      }

      // Set properties
      this.cap.set(cv.CAP_PROP_FRAME_WIDTH, 640);
      this.cap.set(cv.CAP_PROP_FRAME_HEIGHT, 480);
      this.cap.set(cv.CAP_PROP_FPS, 30);

      if (this.logger) {
        this.logger.info(`Video source initialized: ${this.source}`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to initialize video source: ${error}`);
      }
      throw error;
    }
  }

  read(): { success: boolean; frame?: cv.Mat } {
    if (!this.cap) {
      return { success: false };
    }

    try {
      const frame = this.cap.read();
      return { success: true, frame };
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to read frame: ${error}`);
      }
      return { success: false };
    }
  }

  getFrameSize(): { width: number; height: number } {
    if (!this.cap) {
      return { width: 0, height: 0 };
    }

    const width = this.cap.get(cv.CAP_PROP_FRAME_WIDTH);
    const height = this.cap.get(cv.CAP_PROP_FRAME_HEIGHT);
    return { width: Math.round(width), height: Math.round(height) };
  }

  getFPS(): number {
    if (!this.cap) {
      return 0;
    }
    return this.cap.get(cv.CAP_PROP_FPS);
  }

  release(): void {
    if (this.cap) {
      this.cap.release();
      this.cap = null;
    }
  }
}

export class FrameProcessor {
  /**
   * Resize frame to specified dimensions
   */
  static resizeFrame(frame: cv.Mat, width: number, height: number): cv.Mat {
    return frame.resize(height, width);
  }

  /**
   * Crop frame to specified region
   */
  static cropFrame(frame: cv.Mat, x: number, y: number, width: number, height: number): cv.Mat {
    return frame.getRegion(new cv.Rect(x, y, width, height));
  }

  /**
   * Convert BGR frame to RGB
   */
  static convertToRGB(frame: cv.Mat): cv.Mat {
    return frame.cvtColor(cv.COLOR_BGR2RGB);
  }

  /**
   * Convert RGB frame to BGR
   */
  static convertToBGR(frame: cv.Mat): cv.Mat {
    return frame.cvtColor(cv.COLOR_RGB2BGR);
  }

  /**
   * Apply Gaussian blur to frame
   */
  static applyBlur(frame: cv.Mat, kernelSize: number = 5): cv.Mat {
    return frame.gaussianBlur(new cv.Size(kernelSize, kernelSize), 0);
  }

  /**
   * Convert frame to grayscale
   */
  static applyGrayscale(frame: cv.Mat): cv.Mat {
    return frame.cvtColor(cv.COLOR_BGR2GRAY);
  }

  /**
   * Draw text on frame
   */
  static drawText(
    frame: cv.Mat, 
    text: string, 
    position: cv.Point2, 
    fontScale: number = 1.0, 
    color: cv.Vec3 = new cv.Vec3(0, 255, 0),
    thickness: number = 2
  ): cv.Mat {
    return frame.putText(text, position, cv.FONT_HERSHEY_SIMPLEX, fontScale, color, thickness);
  }

  /**
   * Draw rectangle on frame
   */
  static drawRectangle(
    frame: cv.Mat, 
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number,
    color: cv.Vec3 = new cv.Vec3(0, 255, 0), 
    thickness: number = 2
  ): cv.Mat {
    return frame.drawRectangle(new cv.Point2(x1, y1), new cv.Point2(x2, y2), color, thickness);
  }

  /**
   * Convert cv.Mat to Buffer
   */
  static matToBuffer(mat: cv.Mat): Buffer {
    return mat.getDataAsArray().flat() as Buffer;
  }

  /**
   * Convert Buffer to cv.Mat
   */
  static bufferToMat(buffer: Buffer, width: number, height: number, channels: number = 3): cv.Mat {
    return new cv.Mat(buffer, height, width, cv.CV_8UC(channels));
  }

  /**
   * Encode frame to JPEG buffer
   */
  static encodeToJPEG(frame: cv.Mat, quality: number = 90): Buffer {
    return cv.imencode('.jpg', frame, [cv.IMWRITE_JPEG_QUALITY, quality]);
  }

  /**
   * Decode JPEG buffer to frame
   */
  static decodeFromJPEG(buffer: Buffer): cv.Mat {
    return cv.imdecode(buffer);
  }
} 