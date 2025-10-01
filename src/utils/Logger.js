export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

export class Logger {
    static level = LOG_LEVELS.INFO;

    static setLevel(level) {
        Logger.level = level;
    }

    static debug(...args) {
        if (Logger.level <= LOG_LEVELS.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    }

    static info(...args) {
        if (Logger.level <= LOG_LEVELS.INFO) {
            console.log('[INFO]', ...args);
        }
    }

    static warn(...args) {
        if (Logger.level <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    }

    static error(...args) {
        if (Logger.level <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    }
}
