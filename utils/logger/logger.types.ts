type Log = (...props: any[]) => void;

export interface ILogger {
  debug: Log;
  trace: Log;
  info: Log;
  warn: Log;
  error: Log;
}
