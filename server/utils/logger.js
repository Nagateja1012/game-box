const logger = {
    info: (message, meta = {}) => {
        console.log(`[${new Date().toISOString()}] [INFO] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    },
    error: (message, error) => {
        console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error ? `\nStack: ${error.stack}` : '');
    },
    warn: (message, meta = {}) => {
        console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
};

module.exports = logger;
