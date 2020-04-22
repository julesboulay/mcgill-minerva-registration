import { TimeoutError } from "puppeteer/Errors";
import { lookup } from "dns";

/***********************************************************************
 * Constants
 */
const MINERVA_URL = `https://horizon.mcgill.ca/pban1/twbkwbis.P_WWWLogin`;
const SELECTORS = {
  USERNAME: `#mcg_un`,
  PASSWORD: "#mcg_pw",
  LOGIN_BUTTON: `#mcg_un_submit`,
  BREAK_IN: `body > div.pagebodydiv > table:nth-child(3) > tbody > tr > td:nth-child(2) > span`,

  STUDENT_MENU: `body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(2) > td:nth-child(2) > a`,
  REGISTRATION_MENU: `body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(3) > td:nth-child(2) > a`,
  QUICK_ADD_COURSE: `body > div.pagebodydiv > table.menuplaintable > tbody > tr:nth-child(3) > td:nth-child(2) > a`,
  SELECT_TERM: `#term_id`,
  SUBMIT_TERM: `body > div.pagebodydiv > form > input[type=submit]`,

  CRN: `#crn_id1`,
  CRN_SUBMIT: `body > div.pagebodydiv > form > input[type=submit]:nth-child`,
  REGISTRATION_ERRORS: `body > div.pagebodydiv > form > table.datadisplaytable`,

  REGISTRATION_LIMIT_ERROR: `body > div.pagebodydiv > div.infotextdiv > table > tbody > tr > td:nth-child(2) > span`,
};
const SELECTORS_MAP: { [key: string]: string } = Object.keys(SELECTORS).reduce(
  (result: { [key: string]: string }, key) => {
    result[SELECTORS[key]] = key;
    return result;
  },
  {}
);
const CMND_LINE = `\n--------------------------------------------------------------`;

/***********************************************************************
 * Helpers
 */
const formatNumber = (n: number, digits: number): string => {
  let zeros = "";
  for (let i = 0; i < digits; i++) zeros += "0";
  return (zeros + n).slice(-digits);
};

const internetIsConnected = (): Promise<boolean> => {
  return new Promise<boolean>(function (resolve) {
    lookup("google.com", function (error, address, family) {
      if (!!error && error.code == "ENOTFOUND") return resolve(false);
      resolve(true);
    });
  });
};

const findSelector = (error: TimeoutError): string => {
  const [pre, selector, post] = error.message.split(`"`);
  return SELECTORS_MAP[selector];
};

const timenow = (): string => {
  const f = (n: number): string => formatNumber(n, 2);
  const date = new Date();
  return (
    `${f(date.getDate())}/${f(date.getMonth() + 1)}/${f(date.getFullYear())}` +
    ` @ ${f(date.getHours())}:${f(date.getMinutes())}:${f(date.getSeconds())}`
  );
};

const waitfor = async (val: number, vtype: "sec" | "min"): Promise<void> => {
  return new Promise<void>(function (resolve) {
    setTimeout(() => {
      resolve();
    }, val * (vtype === "sec" ? 1 : 60) * 1000);
  });
};

export {
  MINERVA_URL,
  SELECTORS,
  SELECTORS_MAP,
  CMND_LINE,
  formatNumber,
  internetIsConnected,
  findSelector,
  waitfor,
  timenow,
};
