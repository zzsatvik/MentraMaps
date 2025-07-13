/**
 * Logger utilities for AI Video Stream Interpreter
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

export interface LoggerConfig {
  level: string;
  filename?: string;
  maxSize?: string;
  maxFiles?: number;
}

export class Logger {
  private logger: winston.Logger;

  constructor(name: string = 'video_interpreter', config?: LoggerConfig) {
    const level = config?.level || process.env.LOG_LEVEL || 'info';
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        )
      })
    ];

    // Add file transport if filename is provided
    if (config?.filename) {
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, config.filename),
          maxsize: config.maxSize ? parseInt(config.maxSize) : 5242880, // 5MB
          maxFiles: config.maxFiles || 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: name },
      transports
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }
}

export function setupLogger(name: string = 'video_interpreter', config?: LoggerConfig): Logger {
  return new Logger(name, config);
} 