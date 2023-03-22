import chalk from 'chalk';

export interface ILogger {
  error(...args);
  warn(...args);
  log(...args);
}

export class ConsoleLogger implements ILogger {
  public error(errorMessage: string, ...args) {
    console.error(chalk.red(errorMessage), args.length ? args : '');
  }

  public log(message: string, ...args) {
    console.log(message, args.length ? args : '');
  }

  public warn(warnMessage: string, ...args) {
    console.warn(chalk.yellow(warnMessage), args.length ? args : '');
  }
}

export const consoleLogger = new ConsoleLogger();
