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
    htmlfile: string;
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

class MinervaError extends Error {
  constructor(public message: string, public parent?: Error) {
    super(message);
    if (parent) this.stack = `${parent.stack}\n${this.stack}`;
  }
}

class LoggedOutError extends MinervaError {
  constructor(public message: string, public parent?: Error) {
    super(message, parent);
    Object.setPrototypeOf(this, LoggedOutError.prototype);
  }
}

class CredentialsError extends MinervaError {
  constructor(public message: string, public parent?: Error) {
    super(message, parent);
    Object.setPrototypeOf(this, CredentialsError.prototype);
  }
}

class RegistrationsExhaustedError extends MinervaError {
  constructor(public message: string, public parent?: Error) {
    super(message, parent);
    Object.setPrototypeOf(this, RegistrationsExhaustedError.prototype);
  }
}

class CriticalError extends MinervaError {
  constructor(public message: string, public parent?: Error) {
    super(message, parent);
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
  CredentialsError,
  RegistrationsExhaustedError,
  CriticalError,
};
