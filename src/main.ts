#!/usr/bin/env node
/**
 * Main entry point for AI Video Stream Interpreter
 * Real-time video analysis using OpenCV and AI models
 */

import { config } from 'dotenv';
import { VideoInterpreter } from './video-interpreter';
import { Logger } from './utils/logger';
import { RoboflowConfig } from './types';

// Load environment variables
config();

interface CommandLineArgs {
  source: string;
  model: string;
  confidence: number;
  output: string;
  web: boolean;
  help: boolean;
}

function parseArguments(): CommandLineArgs {
  const args = process.argv.slice(2);
  const parsed: CommandLineArgs = {
    source: process.env.DEFAULT_SOURCE || '0',
    model: process.env.DEFAULT_MODEL || 'coco',
    confidence: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.5'),
    output: process.env.OUTPUT_DIR || './output',
    web: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        parsed.source = args[++i];
        break;
      case '--model':
        parsed.model = args[++i];
        break;
      case '--confidence':
        parsed.confidence = parseFloat(args[++i]);
        break;
      case '--output':
        parsed.output = args[++i];
        break;
      case '--web':
        parsed.web = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

function showHelp(): void {
  console.log(`
🎥 AI Video Stream Interpreter

Usage: npm start [options]

Options:
  --source <source>       Video source (0 for webcam, file path, or RTSP URL)
  --model <model>         AI model to use (coco, yolo, ocr, or custom)
  --confidence <value>    Confidence threshold (0.0 to 1.0)
  --output <dir>          Output directory for saved detections
  --web                   Launch web interface instead of command line
  --help, -h             Show this help message

Examples:
  npm start --source 0 --model coco
  npm start --source video.mp4 --model yolo --confidence 0.7
  npm start --web

Environment Variables:
  ROBOFLOW_API_KEY       Your Roboflow API key
  DEFAULT_SOURCE          Default video source
  DEFAULT_MODEL           Default AI model
  CONFIDENCE_THRESHOLD    Default confidence threshold
  OUTPUT_DIR              Default output directory
  SAVE_DETECTIONS         Enable detection saving (true/false)
  LOG_LEVEL               Logging level (debug, info, warn, error)
`);
}

async function main(): Promise<void> {
  const args = parseArguments();

  if (args.help) {
    showHelp();
    return;
  }

  // Setup logging
  const logger = new Logger('main');

  try {
    // Initialize Roboflow configuration
    let roboflowConfig: RoboflowConfig | undefined;
    if (process.env.ROBOFLOW_API_KEY) {
      roboflowConfig = {
        apiKey: process.env.ROBOFLOW_API_KEY,
        modelName: args.model,
        version: process.env.ROBOFLOW_VERSION
      };
    }

    if (args.web) {
      // Launch web interface
      logger.info('Launching web interface...');
      const { startWebServer } = await import('./web-server');
      await startWebServer();
    } else {
      // Initialize video interpreter
      const interpreter = new VideoInterpreter(
        args.source,
        args.model,
        args.confidence,
        args.output,
        roboflowConfig,
        logger
      );

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully...');
        interpreter.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully...');
        interpreter.stop();
        process.exit(0);
      });

      // Start processing
      await interpreter.run();
    }
  } catch (error) {
    logger.error(`Application error: ${error}`);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 