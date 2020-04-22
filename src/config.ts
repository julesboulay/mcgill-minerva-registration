import { MinervaConfig } from "./minerva/types";
import { SendGridConfig } from "./sendgrid/types";

/***********************************************************************
 * TYPES
 */
type Config = {
  sendgrid: SendGridConfig;
  minerva: MinervaConfig;
};

/***********************************************************************
 * CONFIG - Local SetUP
 */
const localConfig: Config = {
  /* Minerva Config */
  minerva: {
    /**
     * Minerva Credentials
     * - username: McGill Minerva username
     * - password: McGill Minerva password
     */
    credentials: {
      username: ``,
      password: ``,
    },

    /**
     * Minerva Registration
     * - term: must use browser to inspect (described above)
     * - termStr: Not important, just for displaying in command line
     * - crn: CRN of course
     *
     * NOTE: For 'term' field, you must use a browser to inspect the "value" of the
     * html <option ...> inside the <select ...> for the term wanted.
     * This would be the <select ...> in the 'Select Term' page in Minerva.
     */
    registration: {
      term: ``,
      termStr: ``,
      crn: ``,
    },

    /**
     * - pdfs: Path to pdfs folder where pdfs are to be stored (screenshot of page
     * upon error and/or screenshot of page upon successfull registration).
     */
    dirPath: `./pdfs`,

    /**
     * - timeout: Before navigation timeout (in miliseconds)
     * - timeoutBetweenAttempts: Between registration attempts ( in sec)
     * - timeoutBetweenErrors: Between errors (in min)
     * - errorsToleratedLimit: Maximum number of errors tolerated
     *
     * NOTE: Avoid timeoutBetweenAttempts smaller than 5 mins. Minerva has a rate
     * limiting system.
     */
    timeout: 5 * 1000,
    timeoutBetweenAttempts: 7 * 60,
    timeoutBetweenErrors: 2,
    errorsToleratedLimit: 100,
  },

  /**
   * Send Grid Config
   * - enable: enable email service
   * - apiKey: Send Grid API key
   * - toEmail: email to
   * - fromEmail: email from
   */
  sendgrid: {
    enable: false,
    apiKey: ``,
    toEmail: ``,
    fromEmail: ``,
  },
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
        minerva: {
          credentials: {
            username: username,
            password: password,
          },
          registration: {
            term: term,
            termStr: ``,
            crn: crn,
          },
          dirPath: `./pdfs`,
          timeout: 5 * 1000,
          timeoutBetweenAttempts: 7 * 60,
          timeoutBetweenErrors: 2,
          errorsToleratedLimit: 100,
        },
        sendgrid: {
          enable: false,
          apiKey: sendGridApiKey,
          toEmail: sendGridEmail,
          fromEmail: ``,
        },
      };

    default:
      return {
        minerva: {
          credentials: {
            username: ``,
            password: ``,
          },
          registration: {
            term: ``,
            termStr: ``,
            crn: ``,
          },
          dirPath: ``,
          timeout: 0,
          timeoutBetweenAttempts: 0,
          timeoutBetweenErrors: 0,
          errorsToleratedLimit: 0,
        },
        sendgrid: {
          enable: false,
          apiKey: ``,
          toEmail: ``,
          fromEmail: ``,
        },
      };
  }
}

export { Config, envConfig };
