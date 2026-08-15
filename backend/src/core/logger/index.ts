export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  info(message: string, meta?: any): void {
    console.log(`\x1b[36m${this.formatMessage('INFO', message, meta)}\x1b[0m`);
  }

  warn(message: string, meta?: any): void {
    console.warn(`\x1b[33m${this.formatMessage('WARN', message, meta)}\x1b[0m`);
  }

  error(message: string, meta?: any): void {
    console.error(`\x1b[31m${this.formatMessage('ERROR', message, meta)}\x1b[0m`);
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`\x1b[90m${this.formatMessage('DEBUG', message, meta)}\x1b[0m`);
    }
  }
}

export const logger = new Logger();
