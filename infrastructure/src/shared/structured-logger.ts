export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  userId?: string;
  hospitalId?: string;
  [key: string]: unknown;
}

// WAT = UTC+1 (West Africa Time, REQ-NF-024)
function toWAT(): string {
  return new Date(Date.now() + 3_600_000).toISOString().replace('Z', '+01:00');
}

const FN = process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'local';

export function log(level: LogLevel, message: string, ctx: LogContext = {}): void {
  console.log(
    JSON.stringify({ level, timestamp: toWAT(), functionName: FN, message, ...ctx }),
  );
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('DEBUG', msg, ctx),
  info:  (msg: string, ctx?: LogContext) => log('INFO',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => log('WARN',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('ERROR', msg, ctx),
};
