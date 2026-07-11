/**
 * Centralized Logger
 * Logs all important user actions and errors to chrome.storage.local
 * for debugging and future analytics.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  event: string;
  data?: any;
}

const MAX_LOG_ENTRIES = 500;

function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

async function getLogs(): Promise<LogEntry[]> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['gmailer_logs'], (res) => {
        resolve(res.gmailer_logs || []);
      });
    } else {
      resolve([]);
    }
  });
}

async function saveLogs(logs: LogEntry[]): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ gmailer_logs: logs });
  }
}

export async function log(level: LogLevel, event: string, data?: any): Promise<void> {
  const entry: LogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
  };

  // Always output to the console too
  const consoleFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  consoleFn(`[GMailer][${level}] ${event}`, data || '');

  // Store persistently
  const logs = await getLogs();
  const trimmedLogs = [entry, ...logs].slice(0, MAX_LOG_ENTRIES);
  await saveLogs(trimmedLogs);
}

// Convenience methods
export const logger = {
  info: (event: string, data?: any) => log('INFO', event, data),
  warn: (event: string, data?: any) => log('WARN', event, data),
  error: (event: string, data?: any) => log('ERROR', event, data),
  debug: (event: string, data?: any) => log('DEBUG', event, data),
};

export async function clearLogs(): Promise<void> {
  await saveLogs([]);
}

export { getLogs };
