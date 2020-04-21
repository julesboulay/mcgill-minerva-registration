import puppeteer, { Page } from "puppeteer";
import { Config, LoggedOutError, Counts, CredentialsError } from "./types";
import {
  SELECTORS,
  MINERVA_URL,
  waitfor,
  timenow,
  CMND_LINE,
  findSelector,
  internetIsConnected,
} from "./util";
import { config } from "./config";
import { TimeoutError } from "puppeteer/Errors";

/**
 * Checks if user has been logged out.
 * @param page
 * @param config
 */
async function loggedOut(page: Page, { timeout }: Config): Promise<boolean> {
  let loggedOut: boolean = false;

  await page.waitForNavigation({ timeout }).catch(() => {});
  const breakedIn = page
    .waitForSelector(SELECTORS.BREAK_IN, { timeout })
    .then(() => {
      loggedOut = true;
    })
    .catch(() => {});
  const inLoginPage = page
    .waitForSelector(SELECTORS.USERNAME, { timeout })
    .then(() => {
      loggedOut = true;
    })
    .catch(() => {});
  await Promise.all([breakedIn, inLoginPage]);

  return loggedOut;
}

/**
 * Login to minerva given credentials.
 * @param page
 * @param config
 */
async function login(
  page: Page,
  { credentials, timeout }: Config
): Promise<void> {
  await page.click(SELECTORS.USERNAME);
  await page.keyboard.type(credentials.username);

  await page.click(SELECTORS.PASSWORD);
  await page.keyboard.type(credentials.password);

  await page.click(SELECTORS.LOGIN_BUTTON);
  await page.waitForNavigation({ timeout }).catch((error) => {
    if (error instanceof TimeoutError)
      throw new CredentialsError(`ERROR: Incorrect credentials.`);
    throw error;
  });

  const stillInLogginPage = !!(await page.$(SELECTORS.USERNAME));
  if (stillInLogginPage) throw new Error(`ERROR: Couldn't login.`);

  const notInMainMenu = !(await page.$(SELECTORS.STUDENT_MENU));
  if (notInMainMenu) throw new Error(`ERROR: Not in main menu.`);
}

/**
 * Direct to 'Quick Add or Drop Course Sections' on minerva once logged in.
 * @param page
 * @param config
 */
async function directToRegistrationPage(
  page: Page,
  { registration, timeout }: Config
): Promise<void> {
  await page.click(SELECTORS.STUDENT_MENU);
  await page.waitForSelector(SELECTORS.REGISTRATION_MENU, { timeout });

  await page.click(SELECTORS.REGISTRATION_MENU);
  await page.waitForSelector(SELECTORS.QUICK_ADD_COURSE), { timeout };

  await page.click(SELECTORS.QUICK_ADD_COURSE);
  await page.waitForSelector(SELECTORS.SELECT_TERM, { timeout });

  await page.select(SELECTORS.SELECT_TERM, registration.term);
  await page.click(SELECTORS.SUBMIT_TERM);
  await page.waitForSelector(SELECTORS.CRN, { timeout });
}

/**
 * Attempt to register to class.
 * @param page
 * @param config
 */
async function attemptRegistration(
  page: Page,
  { registration, timeout }: Config
): Promise<boolean> {
  await page.click(SELECTORS.CRN);
  await page.keyboard.type(registration.crn);

  if (!!(await page.$(SELECTORS.CRN_SUBMIT_23)))
    await page.click(SELECTORS.CRN_SUBMIT_23);
  else if (!!(await page.$(SELECTORS.CRN_SUBMIT_26)))
    await page.click(SELECTORS.CRN_SUBMIT_26);
  else throw new Error(`ERROR: Can't find the submit button.`);

  await page.waitForSelector(SELECTORS.CRN, { timeout });

  const registrationError = !!(await page.$(SELECTORS.REGISTRATION_ERRORS));
  if (registrationError) return false;

  return true;
}

/**
 * User flow from login to register attempts.
 * @param page
 * @param config
 */
async function register(
  page: Page,
  config: Config,
  counts: Counts
): Promise<boolean> {
  /* Visit Minerva */
  await page.goto(MINERVA_URL, { waitUntil: "networkidle2" });

  /* Login to Minerva */
  console.info(`Attempt login: #${++counts.logins}`);
  await login(page, config);
  console.info(`Successfully logged in.`);

  /* Visit Quick Add Course Page */
  await directToRegistrationPage(page, config);

  let successfull: boolean = false;
  while (!successfull) {
    /* Attempt Registration */
    console.info(`Attempt registration: #${++counts.attempts} -- ${timenow()}`);

    successfull = await attemptRegistration(page, config).catch(
      async (error) => {
        if (error instanceof CredentialsError) throw error;
        if (await loggedOut(page, config))
          throw new LoggedOutError(`ERROR: Logged out.`);

        throw error;
      }
    );

    if (!successfull) await waitfor(config.timeoutBetweenAttempts, "sec");
  }

  await page.pdf({ path: `${config.pdfs}/registered.pdf`, format: "A4" });
  return successfull;
}

/**
 * Main - attempts to register to class until registered.
 * Creates a headless browser to login to Minerva and attempt registration. Upon
 * logouts or network interuptions, system is put to sleep for specified time.
 * @param config
 */
async function main(config: Config) {
  const { credentials, registration } = config;
  console.info(`Starting minerva registerer.`);
  console.info({
    Username: credentials.username,
    Password: credentials.password.replace("*", credentials.password),
    Term: registration.termStr,
    CRN: registration.crn,
    TimeBetweenAttemps: `${config.timeoutBetweenAttempts} secs`,
  });

  const browser = await puppeteer.launch({ headless: true });
  const counts: Counts = {
    errors: 0,
    logins: 0,
    attempts: 0,
  };

  let registered: boolean = false;
  while (!registered) {
    const page = await browser.newPage();
    console.info(CMND_LINE);

    /* Check Internet */
    if (!(await internetIsConnected())) {
      console.info(`Internet not connected.`);
      console.info(`Pausing: ${2} mins`);
      await waitfor(2, "min");
      continue;
    }

    /* Register flow */
    registered = await register(page, config, counts).catch(async (error) => {
      if (error instanceof LoggedOutError) {
        console.error(error.message);
        return false;
      }
      if (error instanceof CredentialsError) {
        console.error(error.message);
        await browser.close();
        throw error;
      }
      if (error instanceof TimeoutError) {
        console.error(`TimeoutError: ${error.message}`);
        console.info(`Selector: ${findSelector(error)}`);
        console.info(`Pausing: ${1} min`);
        await waitfor(1, "min");
        return false;
      }
      if (++counts.errors >= config.errorsTolerated) {
        console.error(error);
        console.info(`\nNo more errors tolerated.`);
        await browser.close();
        throw error;
      }

      /* Store unknown error state in PDF */
      await page.pdf({
        path: `${config.pdfs}/error${counts.errors}.pdf`,
        format: "A4",
      });

      /* Pause for increasing amunt of mins (depending on #errors) */
      const errorTimeout =
        counts.errors > config.maxTimeoutBetweenErrors
          ? config.maxTimeoutBetweenErrors
          : counts.errors;
      console.error(error);
      console.info(`Error Count: ${counts.errors}`);
      console.info(`Pausing: ${errorTimeout} mins`);
      await waitfor(errorTimeout, "min");

      return false;
    });
  }

  console.info(`\nSuccessfully registered.`);
}

main(config).catch(() => {
  console.log(`Safe exit.`);
});
