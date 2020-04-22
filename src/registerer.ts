import puppeteer, { Page, Browser } from "puppeteer";
import { TimeoutError } from "puppeteer/Errors";
import {
  Config,
  LoggedOutError,
  Counts,
  CredentialsError,
  AttemptsLimitError,
} from "./types";
import {
  SELECTORS,
  MINERVA_URL,
  CMND_LINE,
  waitfor,
  timenow,
  internetIsConnected,
} from "./util";

class MinervaRegisterer {
  private config: Config;
  private counts: Counts;
  private browser: Browser;
  private page: Page;

  /**
   * Constructor
   * @param config
   */
  constructor(config: Config) {
    this.config = config;
    const { credentials, registration, timeoutBetweenAttempts } = this.config;
    console.info({
      Username: credentials.username,
      Term: registration.termStr,
      CRN: registration.crn,
      TimeBetweenAttemps: `${timeoutBetweenAttempts} secs`,
    });
  }

  /**
   * Attempts to register to class until class has been registered to.
   * Creates a headless browser to login to Minerva and attempt registration. Upon
   * logouts or network interuptions, system is put to sleep for specified time.
   * @param config
   */
  public async start(): Promise<boolean> {
    const { errorsToleratedLimit, timeoutBetweenErrors } = this.config;
    console.info(`Starting minerva registerer.`);

    /* Init Puppeteer Browser & Counts */
    this.browser = await puppeteer.launch({ headless: true });
    this.counts = {
      errors: 0,
      logins: 0,
      attempts: 0,
    };

    /* Retry Registration Until Successfull */
    let registered: boolean = false;
    while (!registered) {
      console.info(CMND_LINE);

      /* Init Browser Page */
      if (this.page) this.page.close();
      this.page = await this.browser.newPage();

      /* Check Internet Connection */
      if (await this.noInternetConnection()) {
        await this.waitfor(2, "min", true);
        continue;
      }

      /* Attempt to login to Minerva and register to course */
      registered = await this.register().catch(async (error) => {
        /* Handle Credentials Error */
        if (error instanceof CredentialsError) {
          await this.browser.close();
          throw error;
        } else if (error instanceof AttemptsLimitError) {
          await this.browser.close();
          throw error;
        }

        /* Handle Logout & Timeout Error */
        console.error(error);
        if (error instanceof LoggedOutError) return false;
        else if (error instanceof TimeoutError) return false;

        /* Handle Error Limit Exceeded */
        await this.saveErrorPage();
        if (++this.counts.errors > errorsToleratedLimit) {
          await this.browser.close();
          throw new Error(`Max amount of errors reached.`);
        }

        return false;
      });

      if (!registered) await this.waitfor(timeoutBetweenErrors, "min", true);
    }

    return registered;
  }

  /**
   * User flow from login to register attempts.
   */
  private async register(): Promise<boolean> {
    const { timeoutBetweenAttempts, pdfs } = this.config;

    /* Login to Minerva & go to Registration Page */
    await this.page.goto(MINERVA_URL, { waitUntil: "networkidle2" });
    await this.login();
    await this.traverseToRegistrationPage();

    let successfull: boolean = false;
    while (!successfull) {
      /* Attempt Registration */
      successfull = await this.attemptRegistration().catch(async (error) => {
        if (error instanceof CredentialsError) throw error;
        if (await this.loggedOut()) throw new LoggedOutError(`Logged out.`);

        throw error;
      });

      if (!successfull) await this.waitfor(timeoutBetweenAttempts, "sec");
    }

    await this.page.pdf({ path: `${pdfs}/registered.pdf`, format: "A4" });
    return successfull;
  }

  /**
   * Login to minerva given credentials.
   */
  private async login(): Promise<void> {
    console.info(`Attempt login: #${++this.counts.logins}`);
    const { timeout, credentials } = this.config;

    await this.page.click(SELECTORS.USERNAME);
    await this.page.keyboard.type(credentials.username);

    await this.page.click(SELECTORS.PASSWORD);
    await this.page.keyboard.type(credentials.password);

    await this.page.click(SELECTORS.LOGIN_BUTTON);
    await this.page.waitForNavigation({ timeout }).catch((error) => {
      if (error instanceof TimeoutError)
        throw new CredentialsError(`Incorrect credentials.`);
      throw error;
    });

    const stillInLogginPage = !!(await this.page.$(SELECTORS.USERNAME));
    if (stillInLogginPage) throw new Error(`Couldn't login.`);

    const notInMainMenu = !(await this.page.$(SELECTORS.STUDENT_MENU));
    if (notInMainMenu) throw new Error(`Not in main menu.`);

    console.info(`Successfully logged in.`);
  }

  /**
   * Traverse to 'Quick Add or Drop Course Sections' on minerva once logged in.
   */
  private async traverseToRegistrationPage(): Promise<void> {
    const { timeout, registration } = this.config;

    await this.page.click(SELECTORS.STUDENT_MENU);
    await this.page.waitForSelector(SELECTORS.REGISTRATION_MENU, { timeout });

    await this.page.click(SELECTORS.REGISTRATION_MENU);
    await this.page.waitForSelector(SELECTORS.QUICK_ADD_COURSE), { timeout };

    await this.page.click(SELECTORS.QUICK_ADD_COURSE);
    await this.page.waitForSelector(SELECTORS.SELECT_TERM, { timeout });

    await this.page.select(SELECTORS.SELECT_TERM, registration.term);
    await this.page.click(SELECTORS.SUBMIT_TERM);

    /* Registration Attemps Exceded */
    /* await this.page
      .waitForSelector(SELECTORS.REGISTRATION_LIMIT_ERROR, { timeout })
      .catch((error) => {
        const msg = `Registration attemps exceeded: 
      ${this.counts.attempts} attempts
      ${timenow()}`;
        if (error instanceof TimeoutError) throw new AttemptsLimitError(msg);
        throw error;
      }); */

    await this.page.waitForSelector(SELECTORS.CRN, { timeout });
  }

  /**
   * Attempt to register to a class.
   */
  private async attemptRegistration(): Promise<boolean> {
    console.info(`Attempt: #${++this.counts.attempts} -- ${timenow()}`);
    const { timeout, registration } = this.config;

    await this.page.click(SELECTORS.CRN);
    await this.page.keyboard.type(registration.crn);

    let notFound = true;
    for (let i = 0; i < 50; i++) {
      if (!!(await this.page.$(`${SELECTORS.CRN_SUBMIT}(${i})`))) {
        notFound = false;
        await this.page.click(`${SELECTORS.CRN_SUBMIT}(${i})`);
      }
    }
    if (notFound) throw new Error(`Can't find submit button.`);

    await this.page.waitForSelector(SELECTORS.CRN, { timeout });

    const registrationError = !!(await this.page.$(
      SELECTORS.REGISTRATION_ERRORS
    ));
    if (registrationError) return false;

    console.info(`Successfully registered.`);
    return true;
  }

  /**
   * Checks if user has been logged out from Minerva.
   */
  private async loggedOut(): Promise<boolean> {
    const { timeout } = this.config;
    let loggedOut: boolean = false;

    await this.page.waitForNavigation({ timeout }).catch(() => {});
    const breakedIn = this.page
      .waitForSelector(SELECTORS.BREAK_IN, { timeout })
      .then(() => {
        loggedOut = true;
      })
      .catch(() => {});
    const inLoginPage = this.page
      .waitForSelector(SELECTORS.USERNAME, { timeout })
      .then(() => {
        loggedOut = true;
      })
      .catch(() => {});
    await Promise.all([breakedIn, inLoginPage]);

    return loggedOut;
  }

  /**
   * Saves page at error as pdf.
   */
  private async saveErrorPage(): Promise<void> {
    const { pdfs } = this.config;
    await this.page.pdf({
      path: `${pdfs}/error${this.counts.errors}.pdf`,
      format: "A4",
    });
  }

  /**
   * Sleep for given time.
   * @param time
   * @param t
   */
  private async waitfor(
    time: number,
    t: "sec" | "min",
    print?: boolean
  ): Promise<void> {
    if (print) console.info(`Pausing: ${time} ${t}s`);
    await waitfor(time, t);
  }

  /**
   * Check if internet is connected.
   */
  private async noInternetConnection(): Promise<boolean> {
    const noInternet = !(await internetIsConnected());
    if (noInternet) console.info(`Internet not connected.`);
    return noInternet;
  }
}

export default MinervaRegisterer;
