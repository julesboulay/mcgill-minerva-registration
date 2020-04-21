/***********************************************************************
 * TYPES
 */
type Credentials = {
  username: string;
  password: string;
};

type Registration = {
  term: string;
  termStr: "Fall" | "Winter" | "Summer" | ``;
  crn: string;
};

type Counts = {
  errors: number;
  logins: number;
  attempts: number;
};

type Config = {
  credentials: Credentials;
  registration: Registration;

  pdfs: string;

  errorsTolerated: number;
  timeout: number /* navigation timeout (ms) */;
  timeoutBetweenAttempts: number /* (secs) */;
  maxTimeoutBetweenErrors: number /* (mins) */;
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

export {
  Credentials,
  Registration,
  Counts,
  Config,
  LoggedOutError,
  CredentialsError,
};
