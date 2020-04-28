import { TimeoutError } from "puppeteer/Errors";
import { lookup } from "dns";
import { Times } from "./types";

/***********************************************************************
 * Constants
 */
const MINERVA_URL = `https://horizon.mcgill.ca/pban1/twbkwbis.P_WWWLogin`;
const VSB_URL = `https://vsb.mcgill.ca/vsb/welcome.jsp`;
const SELECTORS = {
  /** Minerva Selectors */
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
  CRN_REGISTERED: `body > div.pagebodydiv > form > table.datadisplaytable > tbody > tr:nth-child(ROW) > td:nth-child(COLUMN) > input[type=hidden]:nth-child(2)`,
  REGISTRATION_ERRORS: `body > div.pagebodydiv > form > table.datadisplaytable`,
  REGISTRATION_LIMIT_ERROR: `body > div.pagebodydiv > div.infotextdiv > table > tbody > tr > td:nth-child(2) > span > a:nth-child(2)`,

  /** VSB Selectors */
  CONTINUE1: `body > div:nth-child(2) > div > input[type=button]`,
  CONTINUE2: `#page_results > div.full_page_content > div.reg_no_courses > p:nth-child(2) > span.mobileRegularOnly > input`,
  SELECT_TERM_VSB: `#term_`,
  SEARCH_COURSE: `#code_number`,
  SUBMIT_COURSE_SEARCH: `#addCourseButton`,
  LIST_COURSE_INFO: `#requirements > div:nth-child(INDEX) > div.courseDiv.bc1.bd1`,
  LIST_COURSE_FULL: `#requirements > div:nth-child(INDEX) > div.courseDiv.bc1.bd1 > div.warningMessageDiv > div > span`,
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
const findSelector = (error: TimeoutError): string => {
  const [pre, selector, post] = error.message.split(`"`);
  return SELECTORS_MAP[selector];
};

/** Sleep Functions */
const waitforMs = (ms: number): Promise<void> => {
  return new Promise<void>(function (resolve) {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
const waitfor = async (value: number, time: Times): Promise<void> => {
  switch (time) {
    case Times.Sec:
      return waitforMs(value * Times.Sec);
    case Times.Min:
      return waitforMs(value * Times.Min);
    case Times.Hr:
      return waitforMs(value * Times.Hr);
    default:
  }
};

/** Internet Connection Function */
const internetNotConnected = (): Promise<boolean> => {
  return new Promise<boolean>(function (resolve) {
    lookup("google.com", function (error, address, family) {
      if (!!error && error.code == "ENOTFOUND") return resolve(true);
      resolve(false);
    });
  });
};

/** Time to String Functions */
const formatNumber = (n: number, digits: number): string => {
  let zeros = "";
  for (let i = 0; i < digits; i++) zeros += "0";
  return (zeros + n).slice(-digits);
};
const timenow = (): string => {
  const f = (n: number): string => formatNumber(n, 2);
  const date = new Date();
  return (
    `${f(date.getDate())}/${f(date.getMonth() + 1)}/${f(date.getFullYear())}` +
    ` @ ${f(date.getHours())}:${f(date.getMinutes())}:${f(date.getSeconds())}`
  );
};

export {
  MINERVA_URL,
  VSB_URL,
  SELECTORS,
  SELECTORS_MAP,
  CMND_LINE,
  waitfor,
  internetNotConnected,
  findSelector,
  timenow,
};
