/***********************************************************************
 * TYPES
 */

type PDFs = "success" | "error";
enum Times {
  Sec = 1000,
  Min = 60 * 1000,
  Hr = 60 * 60 * 1000,
}

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

  readonly pdfs: string;

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

class LoggedOutError extends Error {
  constructor(public message: string) {
    super();
    Object.setPrototypeOf(this, LoggedOutError.prototype);
  }
}

class CredentialsError extends Error {
  constructor(public message: string) {
    super();
    Object.setPrototypeOf(this, CredentialsError.prototype);
  }
}

class MinervaError extends Error {
  constructor(public message: string) {
    super();
    Object.setPrototypeOf(this, MinervaError.prototype);
  }
}

class CriticalError extends Error {
  constructor(public message: string) {
    super();
    Object.setPrototypeOf(this, CriticalError.prototype);
  }
}

export {
  PDFs,
  Times,
  Credentials,
  Registration,
  MinervaConfig,
  Counts,
  LoggedOutError,
  CredentialsError,
  MinervaError,
  CriticalError,
};
