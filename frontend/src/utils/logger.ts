enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Basic configuration (can be expanded)
const config = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
};

const log = (level: LogLevel, message: string, ...args: unknown[]) => {
  if (level >= config.level) {
    const timestamp = new Date().toISOString();
    const levelString = LogLevel[level];
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] [${levelString}] ${message}`, ...args);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] [${levelString}] ${message}`, ...args);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] [${levelString}] ${message}`, ...args);
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] [${levelString}] ${message}`, ...args);
        break;
      default:
        console.log(`[${timestamp}] [LOG] ${message}`, ...args); // Fallback
    }
  }
};

const logger = {
  debug: (message: string, ...args: unknown[]) => log(LogLevel.DEBUG, message, ...args),
  info: (message: string, ...args: unknown[]) => log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: unknown[]) => log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: unknown[]) => log(LogLevel.ERROR, message, ...args),
};

export default logger; 