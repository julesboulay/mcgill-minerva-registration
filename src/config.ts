import { MinervaConfig } from "./minerva/types";
import { SendGridConfig } from "./sendgrid/types";

/***********************************************************************
 * TYPES
 */
type Config = SendGridConfig & MinervaConfig;

/***********************************************************************
 * CONFIG - Local SetUP
 */
const localConfig: Config = {
  /* Minerva credentials */
  credentials: {
    username: ``,
    password: ``,
  },

  registration: {
    /**
     * For 'term' field, you must use browser to inspect the "value" of the
     * html <option ...> inside the <select ...> for the term selection.
     * This would be the <select ...> in the 'Select Term' page in Minerva.
     */
    term: `` /* Must use browser to inspect */,
    termStr: `` /* Not important, just for displaying in command line */,
    crn: `` /* CRN of course */,
  },

  sendGrid: {
    enable: true,
    apiKey: ``,
    email: ``,
  },

  /* Path to pdfs folder where you want pdfs to be stored (screenshot of page upon error) */
  pdfs: `./pdfs`,

  timeout: 3 * 1000 /* before navigation timeout (miliseconds) */,
  timeoutBetweenAttempts: 7 * 60 /* between registration attempt (secs) */,
  timeoutBetweenErrors: 2 /* between errors (mins) */,
  errorsToleratedLimit: 100 /* number of errors tolerable before shuting down */,
};

/**
 * Sets up config for Development or Production envs
 */
function envConfig(): Config {
  const { NODE_ENV = "development" } = process.env;

  switch (NODE_ENV) {
    case "development":
      return localConfig;

    case "production":
      const {
        username = "",
        password = "",
        term = "",
        crn = "",
        sendGridApiKey = "",
        sendGridEmail = "",
      } = process.env;
      return {
        credentials: {
          username: username,
          password: password,
        },

        registration: {
          term: term,
          termStr: ``,
          crn: crn,
        },

        sendGrid: {
          enable: false,
          apiKey: sendGridApiKey,
          email: sendGridEmail,
        },

        pdfs: `./pdfs`,

        timeout: 3 * 1000,
        timeoutBetweenAttempts: 5 * 60,
        timeoutBetweenErrors: 2,
        errorsToleratedLimit: 100,
      };

    default:
      return {
        credentials: {
          username: ``,
          password: ``,
        },

        registration: {
          term: ``,
          termStr: ``,
          crn: ``,
        },

        sendGrid: {
          enable: false,
          apiKey: ``,
          email: ``,
        },

        pdfs: `./pdfs`,

        timeout: 0,
        timeoutBetweenAttempts: 0,
        timeoutBetweenErrors: 0,
        errorsToleratedLimit: 0,
      };
  }
}

export { Config, envConfig };
