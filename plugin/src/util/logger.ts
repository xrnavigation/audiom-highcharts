/**
 * Logger abstraction. Hosts can pass `AudiomGlobalOptions.logger` to
 * route plugin diagnostics into their own logging system; the default
 * goes through `console`.
 */
export interface AudiomLogger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

const PREFIX = '[audiom-highcharts]';

/** Default logger — wraps `console` and tags every entry with `[audiom-highcharts]`. */
export const defaultLogger: AudiomLogger = {
  info: (...args) => console.info(PREFIX, ...args),
  warn: (...args) => console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args)
};

/** Silent logger — useful for tests or to fully mute the plugin. */
export const silentLogger: AudiomLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

/** Resolve to the supplied logger or fall back to `defaultLogger`. */
export function resolveLogger(logger: AudiomLogger | undefined): AudiomLogger {
  return logger ?? defaultLogger;
}
