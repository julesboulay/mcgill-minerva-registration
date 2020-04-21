import { Config } from "./types";

/***********************************************************************
 * CONFIG
 */

const config: Config = {
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

  pdfs: `./pdfs`,

  errorsTolerated: 100 /* also increasing minutes between retries */,
  timeout: 3 * 1000 /* before navigation timeout (miliseconds) */,
  timeoutBetweenAttempts: 30 /* between registration attempt (secs) */,
  maxTimeoutBetweenErrors: 5 /* between errors (mins) */,
};

export { config };
