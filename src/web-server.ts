/**
 * Web Server for AI Video Stream Interpreter
 * Provides real-time video streaming and detection results via WebSocket
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { VideoInterpreter } from './video-interpreter';
import { Logger } from './utils/logger';
import { RoboflowConfig, WebSocketMessage, ProcessingStats } from './types';

export class WebServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private interpreter: VideoInterpreter | null = null;
  private logger: Logger;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.logger = new Logger('web_server');
    this.setupExpress();
    this.setupWebSocket();
  }

  private setupExpress(): void {
    this.app = express();
    
    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));

    // API routes
    this.setupRoutes();

    // Create HTTP server
    this.server = createServer(this.app);
  }

  private setupWebSocket(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);

      socket.on('start_processing', async (data) => {
        await this.startProcessing(socket, data);
      });

      socket.on('stop_processing', () => {
        this.stopProcessing(socket);
      });

      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get processing status
    this.app.get('/api/status', (req, res) => {
      const status = {
        isProcessing: this.interpreter?.isProcessing() || false,
        stats: this.interpreter?.getStats() || null,
        fps: this.interpreter?.getFPS() || 0
      };
      res.json(status);
    });

    // Start processing
    this.app.post('/api/start', async (req, res) => {
      try {
        const { source, model, confidence, output } = req.body;
        
        // Initialize Roboflow configuration
        let roboflowConfig: RoboflowConfig | undefined;
        if (process.env.ROBOFLOW_API_KEY) {
          roboflowConfig = {
            apiKey: process.env.ROBOFLOW_API_KEY,
            modelName: model || 'coco',
            version: process.env.ROBOFLOW_VERSION
          };
        }

        this.interpreter = new VideoInterpreter(
          source || '0',
          model || 'coco',
          confidence || 0.5,
          output || './output',
          roboflowConfig,
          this.logger
        );

        res.json({ success: true, message: 'Processing started' });
      } catch (error) {
        this.logger.error(`Failed to start processing: ${error}`);
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Stop processing
    this.app.post('/api/stop', (req, res) => {
      if (this.interpreter) {
        this.interpreter.stop();
        res.json({ success: true, message: 'Processing stopped' });
      } else {
        res.json({ success: false, message: 'No processing running' });
      }
    });

    // Get detection history
    this.app.get('/api/detections', (req, res) => {
      // In a real implementation, you'd load from database or file
      res.json({ detections: [] });
    });
  }

  private async startProcessing(socket: any, data: any): Promise<void> {
    try {
      const { source, model, confidence, output } = data;

      // Initialize Roboflow configuration
      let roboflowConfig: RoboflowConfig | undefined;
      if (process.env.ROBOFLOW_API_KEY) {
        roboflowConfig = {
          apiKey: process.env.ROBOFLOW_API_KEY,
          modelName: model || 'coco',
          version: process.env.ROBOFLOW_VERSION
        };
      }

      this.interpreter = new VideoInterpreter(
        source || '0',
        model || 'coco',
        confidence || 0.5,
        output || './output',
        roboflowConfig,
        this.logger
      );

      // Start processing loop
      this.startProcessingLoop(socket);

      socket.emit('processing_started', { success: true });
    } catch (error) {
      this.logger.error(`Failed to start processing: ${error}`);
      socket.emit('error', { message: String(error) });
    }
  }

  private async startProcessingLoop(socket: any): Promise<void> {
    if (!this.interpreter) return;

    try {
      while (this.interpreter.isProcessing()) {
        // Simulate frame processing
        await new Promise(resolve => setTimeout(resolve, 100)); // 10 FPS for demo

        // Send stats
        const stats = this.interpreter.getStats();
        const message: WebSocketMessage = {
          type: 'stats',
          data: stats,
          timestamp: Date.now()
        };
        socket.emit('message', message);

        // Simulate detections
        if (Math.random() > 0.7) {
          const detectionMessage: WebSocketMessage = {
            type: 'detection',
            data: {
              class: 'person',
              confidence: 0.85,
              x: 0.5,
              y: 0.5,
              width: 0.2,
              height: 0.4
            },
            timestamp: Date.now()
          };
          socket.emit('message', detectionMessage);
        }
      }
    } catch (error) {
      this.logger.error(`Processing loop error: ${error}`);
      socket.emit('error', { message: String(error) });
    }
  }

  private stopProcessing(socket: any): void {
    if (this.interpreter) {
      this.interpreter.stop();
      socket.emit('processing_stopped', { success: true });
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        this.logger.info(`Web server started on port ${this.port}`);
        this.logger.info(`Health check: http://localhost:${this.port}/health`);
        this.logger.info(`Web interface: http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    if (this.interpreter) {
      this.interpreter.stop();
    }
    if (this.server) {
      this.server.close();
    }
    this.logger.info('Web server stopped');
  }
}

export async function startWebServer(port: number = 3000): Promise<void> {
  const server = new WebServer(port);
  await server.start();
} 