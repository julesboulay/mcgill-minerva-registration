/***********************************************************************
 * TYPES
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

type SendGrid = {
  readonly enable: boolean;
  readonly apiKey: string;
  readonly email: string;
};

type Config = {
  readonly credentials: Credentials;
  readonly registration: Registration;
  readonly sendGrid: SendGrid;

  readonly pdfs: string;

  readonly timeout: number /* navigation timeout (ms) */;
  readonly timeoutBetweenAttempts: number /* (secs) */;
  readonly timeoutBetweenErrors: number /* (mins) */;
  readonly errorsToleratedLimit: number;
};

type Counts = {
  errors: number;
  logins: number;
  attempts: number;
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

class AttemptsLimitError extends Error {
  constructor(public message: string) {
    super();
    Object.setPrototypeOf(this, AttemptsLimitError.prototype);
  }
}

export {
  Credentials,
  Registration,
  SendGrid,
  Config,
  Counts,
  LoggedOutError,
  CredentialsError,
  AttemptsLimitError,
};
