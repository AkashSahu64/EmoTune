const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const levels = { error: 0, warn: 1, info: 2, debug: 3 };

class Logger {
  constructor(level = 'debug') {
    this.level = levels[level] || 3;
  }

  _log(level, message, meta = {}) {
    if (levels[level] > this.level) return;
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, meta };
    const logString = JSON.stringify(logEntry) + '\n';

    console[level === 'error' ? 'error' : 'log'](`[${timestamp}] [${level.toUpperCase()}] ${message}`, Object.keys(meta).length ? meta : '');

    try {
      const dateStr = timestamp.split('T')[0];
      fs.appendFileSync(path.join(logDir, `${dateStr}.log`), logString, 'utf8');
    } catch (e) {}
  }

  info(message, meta) { this._log('info', message, meta); }
  warn(message, meta) { this._log('warn', message, meta); }
  error(message, meta) { this._log('error', message, meta); }
  debug(message, meta) { this._log('debug', message, meta); }
}

module.exports = new Logger();
