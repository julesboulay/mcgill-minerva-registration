import puppeteer, { Page, Browser } from "puppeteer";

/***********************************************************************
 * TYPES
 */

/**
 * Types - Minerva Config & Details
 */
type Credentials = {
  readonly username: string;
  readonly password: string;
};
type Registration = {
  readonly term: string;
  readonly termStr: "Fall" | "Winter" | "Summer" | ``;
  readonly crn: string;
};
type MinervaConfig = {
  readonly credentials: Credentials;
  readonly registration: Registration;

  readonly dirPath: string;

  readonly timeout: number /* navigation timeout (ms) */;
  readonly timeoutBetweenRefreshs: number /* (secs) */;
  readonly timeoutBetweenAttempts: number /* (secs) */;
  readonly timeoutBetweenErrors: number /* (mins) */;
  readonly errorsToleratedLimit: number;
};
type Counts = {
  checks: number;
  logins: number;
  attempts: number;
  errors: number;
  successes: number;
};

/**
 * Types - Util
 */
type PDF = "success" | "error";
type PDFinfo = {
  errors: {
    filename: string;
    timestamp: string;
    stack: string;
  }[];
  registrations: {
    filename: string;
    timestamp: string;
    crn: string;
  }[];
};
enum Times {
  Sec = 1000,
  Min = 60 * 1000,
  Hr = 60 * 60 * 1000,
}

/**
 * Types - Errors
 */
const errorSeperator = `\n--- STACK ---\n`;
class MinervaError extends Error {
  constructor(public message: string, parent: Error) {
    super(message);
    if (parent) this.stack = `${parent.stack}${errorSeperator}${this.stack}`;
  }
}
class LoggedOutError extends MinervaError {
  constructor(public message: string, error?: Error) {
    super(message, error);
    Object.setPrototypeOf(this, LoggedOutError.prototype);
  }
}
class CriticalError extends MinervaError {
  constructor(public message: string, error?: Error) {
    super(message, error);
    Object.setPrototypeOf(this, CriticalError.prototype);
  }
}

/**
 * Puppeteer Handler
 */
class Handler {
  protected browser: Browser;
  protected page: Page;

  /**
   * Constructor
   * @param timeout
   */
  constructor(private readonly timeout: number, private readonly url: string) {}

  /**
   * Create new Browser & Page (deletes old ones) and goes to url.
   */
  public async init(): Promise<void> {
    await this.destroy();
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultNavigationTimeout(this.timeout);
    this.page.setDefaultTimeout(this.timeout);
    await this.page.goto(this.url, { waitUntil: "networkidle2" });
  }

  /**
   * Close Puppeteer Browser & Page (if any).
   */
  public async destroy(): Promise<void> {
    if (!!this.page && !!this.page.close) {
      await this.page.close().catch(() => {});
      delete this.page;
    }
    if (!!this.browser && !!this.browser.close) {
      await this.browser.close().catch(() => {});
      delete this.browser;
    }
  }

  /**
   * Saves PDF of current page at file path.
   * @param path
   */
  public async savePDF(path: string): Promise<void> {
    await this.page.pdf({ path, format: "A4" });
  }
}

export {
  Times,
  Credentials,
  Registration,
  MinervaConfig,
  Counts,
  PDF,
  PDFinfo,
  MinervaError,
  LoggedOutError,
  CriticalError,
  Handler,
};
