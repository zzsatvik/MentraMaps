/**
 * Type definitions for AI Video Stream Interpreter
 */

export interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}

export interface DetectionResult {
  predictions: Detection[];
  error?: string;
  full_text?: string;
}

export interface VideoSource {
  source: string | number;
  width: number;
  height: number;
  fps: number;
}

export interface ModelConfig {
  name: string;
  confidenceThreshold: number;
  apiKey?: string;
}

export interface ProcessingConfig {
  saveDetections: boolean;
  outputDir: string;
  logLevel: string;
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };
}

export interface FrameData {
  frame: Buffer;
  timestamp: number;
  frameNumber: number;
}

export interface AnnotatedFrame {
  frame: Buffer;
  detections: Detection[];
  fps: number;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'frame' | 'detection' | 'stats' | 'error';
  data: any;
  timestamp: number;
}

export interface ProcessingStats {
  fps: number;
  totalDetections: number;
  classDistribution: Record<string, number>;
  processingTime: number;
}

export type ModelType = 'coco' | 'yolo' | 'ocr' | 'custom';

export interface RoboflowConfig {
  apiKey: string;
  modelName: string;
  version?: string;
}

export interface LoggerConfig {
  level: string;
  filename?: string;
  maxSize?: string;
  maxFiles?: number;
} 