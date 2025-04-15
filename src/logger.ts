import * as fs from "fs";
import * as path from "path";

export class Logger {
  private logDir: string;
  private logFilePath: string;
  private latestLogPath: string;
  private jsonlFilePath: string;
  private latestJsonlPath: string;
  private static instance: Logger;

  private constructor() {
    this.logDir = path.join(process.cwd(), "out");
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    this.logFilePath = path.join(this.logDir, `${timestamp}.log`);
    this.latestLogPath = path.join(this.logDir, "latest.log");
    this.jsonlFilePath = path.join(this.logDir, `${timestamp}.jsonl`);
    this.latestJsonlPath = path.join(this.logDir, "latest.jsonl");
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      fs.mkdirSync(this.logDir, { recursive: true });

      // Clear the latest.jsonl file when starting
      if (fs.existsSync(this.latestJsonlPath)) {
        fs.writeFileSync(this.latestJsonlPath, "", "utf-8");
      }
    } catch (error) {
      console.error(
        `Failed to create log directory or clear latest.jsonl: ${error}`
      );
    }
  }

  log(message: string | object) {
    const timestamp = new Date().toISOString();

    // Handle string messages (legacy format)
    if (typeof message === "string") {
      const logEntry = `[${timestamp}] ${message}\n`;
      try {
        // Write to timestamp-based log file
        fs.appendFileSync(this.logFilePath, logEntry, "utf-8");
        // Write to latest.log file
        fs.appendFileSync(this.latestLogPath, logEntry, "utf-8");
      } catch (error) {
        console.error(`Failed to write to log files: ${error}`);
      }
      return;
    }

    // Handle JSON objects
    try {
      // Prepare JSON object with timestamp
      const jsonObject = {
        timestamp,
        ...(message instanceof Object ? message : { message }),
      };

      // Convert to JSONL format (one JSON object per line)
      const jsonLine = JSON.stringify(jsonObject) + "\n";

      // Write to timestamp-based JSONL file
      fs.appendFileSync(this.jsonlFilePath, jsonLine, "utf-8");

      // Write to latest.jsonl file
      fs.appendFileSync(this.latestJsonlPath, jsonLine, "utf-8");

      // Also write to regular log files for backward compatibility
      const logEntry = `[${timestamp}] ${JSON.stringify(message)}\n`;
      fs.appendFileSync(this.logFilePath, logEntry, "utf-8");
      fs.appendFileSync(this.latestLogPath, logEntry, "utf-8");
    } catch (error) {
      console.error(`Failed to write to JSONL files: ${error}`);
    }
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();
