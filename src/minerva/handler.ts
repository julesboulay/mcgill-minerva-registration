import puppeteer, { Page, Browser } from "puppeteer";
import { TimeoutError } from "puppeteer/Errors";
import { Credentials, CriticalError } from "./types";
import { SELECTORS, MINERVA_URL } from "./util";

class MinervaHandler {
  private browser: Browser;
  private page: Page;

  /**
   * Constructor
   * @param timeout
   */
  constructor(private readonly timeout: number) {}

  /**
   * Create new Browser & Page (deletes old ones) and goes to
   * Minerva Login Page.
   */
  public async init(): Promise<void> {
    await this.destroy();
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.goto(MINERVA_URL, { waitUntil: "networkidle2" });
  }

  /**
   * Close Puppeteer Browser & Page (if any).
   */
  public async destroy(): Promise<void> {
    if (!!this.page && !!this.page.close) {
      await this.page.close().catch(() => {});
      delete this.page;
    }
    if (!!this.browser && !!this.browser.close) {
      await this.browser.close().catch(() => {});
      delete this.browser;
    }
  }

  /**
   * Login to minerva given config credentials.
   * @param credentials
   */
  public async login(creds: Credentials): Promise<void> {
    const { timeout } = this;

    await this.page.click(SELECTORS.USERNAME);
    await this.page.keyboard.type(creds.username);

    await this.page.click(SELECTORS.PASSWORD);
    await this.page.keyboard.type(creds.password);

    await this.page.click(SELECTORS.LOGIN_BUTTON);
    await this.page.waitForNavigation({ timeout }).catch((error) => {
      if (error instanceof TimeoutError)
        throw new CriticalError(`Incorrect Credentials.`, error);
      throw error;
    });

    const stillInLogginPage = !!(await this.page.$(SELECTORS.USERNAME));
    if (stillInLogginPage) throw new CriticalError(`Unsuccessfull Login.`);

    const notInMainMenu = !(await this.page.$(SELECTORS.STUDENT_MENU));
    if (notInMainMenu) throw new CriticalError(`Unsuccessfull Login.`);
  }

  /**
   * Traverse to 'Quick Add or Drop Course Sections' on minerva from 'Main Menu'.
   * @param term
   */
  public async gotoRegistrationPage(term: string): Promise<void> {
    const { timeout } = this;

    await this.page.click(SELECTORS.STUDENT_MENU);
    await this.page.waitForSelector(SELECTORS.REGISTRATION_MENU, { timeout });

    await this.page.click(SELECTORS.REGISTRATION_MENU);
    await this.page.waitForSelector(SELECTORS.QUICK_ADD_COURSE), { timeout };

    await this.page.click(SELECTORS.QUICK_ADD_COURSE);
    await this.page.waitForSelector(SELECTORS.SELECT_TERM, { timeout });

    await this.page.select(SELECTORS.SELECT_TERM, term);
    await this.page.click(SELECTORS.SUBMIT_TERM);
    await this.page.waitForSelector(SELECTORS.CRN, { timeout });
  }

  /**
   * Attempt to register - inserts CRNs and submits changes.
   * @param crn
   */
  public async attemptRegistration(crn: string): Promise<boolean> {
    const { timeout } = this;

    await this.page.click(SELECTORS.CRN);
    await this.page.keyboard.type(crn);

    const CRN_SUBMIT = await this.findSubmitBtnSelector();
    await this.page.click(CRN_SUBMIT);

    /* TODO - test this */
    await this.page
      .waitForSelector(SELECTORS.CRN, { timeout })
      .catch(async (error) => {
        await this.page
          .waitForSelector(SELECTORS.REGISTRATION_LIMIT_ERROR, { timeout })
          .then(() => {
            throw new CriticalError(`Registrations Exceeded.`);
          })
          .catch(() => {
            throw error;
          });
      });

    const registrationError = await this.page.$(SELECTORS.REGISTRATION_ERRORS);
    if (!!registrationError) return false;

    return true;
  }

  /**
   * Checks if user has been logged out from Minerva.
   */
  public async loggedOut(): Promise<boolean> {
    const { timeout } = this;
    let loggedOut: boolean = false;

    await this.page.waitForNavigation({ timeout }).catch(() => {});
    const checkIfbreakedIn = this.page
      .waitForSelector(SELECTORS.BREAK_IN, { timeout })
      .then(() => {
        loggedOut = true;
      })
      .catch(() => {});
    const checkIfInLoginPage = this.page
      .waitForSelector(SELECTORS.USERNAME, { timeout })
      .then(() => {
        loggedOut = true;
      })
      .catch(() => {});
    await Promise.all([checkIfbreakedIn, checkIfInLoginPage]).catch(() => {});

    return loggedOut;
  }

  /**
   * Finds the Submit Registration button if Minerva's
   * Rate-Limiter system changes its ID.
   */
  private async findSubmitBtnSelector(): Promise<string> {
    const waitForSelector = (SELECTOR: string) =>
      this.page.waitForSelector(SELECTOR);

    return new Promise<string>(async function (resolve, reject) {
      let resolved: boolean = false;
      const searches: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const CRN_SUBMIT = `${SELECTORS.CRN_SUBMIT}(${i})`;
        const searchSelector = waitForSelector(CRN_SUBMIT)
          .then((element) => {
            if (element && !resolved) {
              resolved = true;
              resolve(CRN_SUBMIT);
            }
          })
          .catch(() => {});
        searches.push(searchSelector);
      }

      await Promise.all(searches).catch(() => {});
      if (!resolved)
        reject(new CriticalError(`Submit Registration Button Not Found.`));
    });
  }

  /**
   * Saves PDF of current page at file path.
   * @param path
   */
  public async savePDF(path: string): Promise<void> {
    await this.page.pdf({ path, format: "A4" });
  }
}

export default MinervaHandler;
