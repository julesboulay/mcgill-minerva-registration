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
  readonly timeoutBetweenAttempts: number /* (secs) */;
  readonly timeoutBetweenErrors: number /* (mins) */;
  readonly errorsToleratedLimit: number;
};
type Counts = {
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
};
