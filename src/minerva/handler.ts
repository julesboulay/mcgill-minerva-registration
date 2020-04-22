import puppeteer, { Page, Browser } from "puppeteer";
import { TimeoutError } from "puppeteer/Errors";
import { MinervaConfig, CredentialsError, PDFs } from "./types";
import { SELECTORS, MINERVA_URL } from "./util";

class MinervaHandler {
  private config: MinervaConfig;
  private browser: Browser;
  private page: Page;

  /**
   * Constructor
   * @param config
   */
  constructor(config: MinervaConfig, debug?: boolean) {
    this.config = config;
  }

  /**
   * Init Puppeteer Browser.
   */
  public async init(): Promise<void> {
    this.browser = await puppeteer.launch({ headless: true });
  }

  /**
   * Close Puppeteer Browser & Page (if any).
   */
  public async destroy(): Promise<void> {
    if (this.page) {
      this.page.close();
      delete this.page;
    }
    if (this.browser) {
      this.browser.close();
      delete this.browser;
    }
  }

  /**
   * Create new Browser Page (deletes old one) and visits Minerva URL.
   */
  public async newMinervaPage(): Promise<void> {
    if (this.page) {
      this.page.close();
      delete this.page;
    }

    this.page = await this.browser.newPage();
    await this.page.goto(MINERVA_URL, { waitUntil: "networkidle2" });
  }

  /**
   * Login to minerva given config credentials.
   */
  public async login(): Promise<void> {
    const { timeout, credentials } = this.config;

    await this.page.click(SELECTORS.USERNAME);
    await this.page.keyboard.type(credentials.username);

    await this.page.click(SELECTORS.PASSWORD);
    await this.page.keyboard.type(credentials.password);

    await this.page.click(SELECTORS.LOGIN_BUTTON);
    await this.page.waitForNavigation({ timeout }).catch((error) => {
      if (error instanceof TimeoutError)
        throw new CredentialsError(`Incorrect Credentials.`, error);
      throw error;
    });

    const stillInLogginPage = !!(await this.page.$(SELECTORS.USERNAME));
    if (stillInLogginPage) throw new CredentialsError(`Unsuccessfull Login.`);

    const notInMainMenu = !(await this.page.$(SELECTORS.STUDENT_MENU));
    if (notInMainMenu) throw new CredentialsError(`Not in Main Menu.`);
  }

  /**
   * Traverse to 'Quick Add or Drop Course Sections' on minerva once logged in.
   *
   * TODO - catch limit exceeded
   */
  public async traverseToRegistrationPage(): Promise<void> {
    const { timeout, registration } = this.config;

    await this.page.click(SELECTORS.STUDENT_MENU);
    await this.page.waitForSelector(SELECTORS.REGISTRATION_MENU, { timeout });

    await this.page.click(SELECTORS.REGISTRATION_MENU);
    await this.page.waitForSelector(SELECTORS.QUICK_ADD_COURSE), { timeout };

    await this.page.click(SELECTORS.QUICK_ADD_COURSE);
    await this.page.waitForSelector(SELECTORS.SELECT_TERM, { timeout });

    await this.page.select(SELECTORS.SELECT_TERM, registration.term);
    await this.page.click(SELECTORS.SUBMIT_TERM);

    /* Check if Registration Attemps Exceded */
    /* await this.page
      .waitForSelector(SELECTORS.REGISTRATION_LIMIT_ERROR, { timeout })
      .catch((error) => {
        const msg = `Registration attemps exceeded: 
      ${this.counts.attempts} attempts
      ${timenow()}`;
        if (error instanceof TimeoutError) throw new RegistrationsExhaustedError(msg, error);
        throw error;
      }); */

    await this.page.waitForSelector(SELECTORS.CRN, { timeout });
  }

  /**
   * Attempt to register - inserts CRNs and submits changes.
   *
   * TODO - support several CRN's
   */
  public async attemptRegistration(): Promise<boolean> {
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
    if (notFound) throw new Error(`Can't Find Submit Button.`);

    await this.page.waitForSelector(SELECTORS.CRN, { timeout });

    const registrationError = !!(await this.page.$(
      SELECTORS.REGISTRATION_ERRORS
    ));
    if (registrationError) return false;

    return true;
  }

  /**
   * Checks if user has been logged out from Minerva.
   */
  public async loggedOut(): Promise<boolean> {
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
   * Save current page as PDF.
   * @param ftype
   * @param count
   */
  public async savePage(ftype: PDFs, count: number): Promise<void> {
    const { pdfs } = this.config;
    let path: string = ``;
    switch (ftype) {
      case "error":
        path = `${pdfs}/error${count}.pdf`;
        break;
      case "success":
        path = `${pdfs}/error${count}.pdf`;
        break;
      default:
    }
    if (path) await this.page.pdf({ path, format: "A4" });
  }
}

export default MinervaHandler;
