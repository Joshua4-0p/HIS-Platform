// REQ-NF-024: every Lambda emits structured JSON logs with these fields
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  functionName: string;
  requestId: string;
  userId: string;
  hospitalId: string;
  timestamp: string; // WAT (UTC+1)
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1

function watTimestamp(): string {
  return new Date(Date.now() + WAT_OFFSET_MS).toISOString().replace('Z', '+01:00');
}

export function createLogger(context: { functionName: string; requestId: string }) {
  const base = {
    functionName: context.functionName,
    requestId: context.requestId,
  };

  function log(
    level: LogLevel,
    message: string,
    userId: string,
    hospitalId: string,
    extra?: Record<string, unknown>
  ) {
    const entry: LogEntry = {
      ...base,
      userId,
      hospitalId,
      timestamp: watTimestamp(),
      level,
      message,
      ...extra,
    };
    console.log(JSON.stringify(entry));
  }

  return {
    info: (msg: string, userId: string, hospitalId: string, extra?: Record<string, unknown>) =>
      log('INFO', msg, userId, hospitalId, extra),
    warn: (msg: string, userId: string, hospitalId: string, extra?: Record<string, unknown>) =>
      log('WARN', msg, userId, hospitalId, extra),
    error: (msg: string, userId: string, hospitalId: string, extra?: Record<string, unknown>) =>
      log('ERROR', msg, userId, hospitalId, extra),
  };
}
