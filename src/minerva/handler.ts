import puppeteer, { Page, Browser } from "puppeteer";
import { TimeoutError } from "puppeteer/Errors";
import {
  MinervaConfig,
  CredentialsError,
  PDF,
  RegistrationError,
} from "./types";
import { SELECTORS, MINERVA_URL } from "./util";
import Logger from "./logger";

class MinervaHandler {
  private config: MinervaConfig;
  private browser: Browser;
  private page: Page;
  private logger: Logger;

  /**
   * Constructor
   * @param config
   */
  constructor(config: MinervaConfig, debug?: boolean) {
    this.config = config;
    this.logger = new Logger(config.dirPath);
  }

  /**
   * Init Puppeteer Browser.
   */
  public async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });
    await this.logger.init();
  }

  /**
   * Close Puppeteer Browser & Page (if any).
   */
  public async destroy(): Promise<void> {
    if (!!this.page) {
      await this.page.close();
      delete this.page;
    }
    if (!!this.browser) {
      await this.browser.close();
      delete this.browser;
    }
  }

  /**
   * Create new Browser Page (deletes old one) and visits Minerva URL.
   */
  public async newMinervaPage(): Promise<void> {
    if (this.page) {
      await this.page.close();
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
        throw new CredentialsError(`Incorrect Credentials.`, error.stack);
      throw error;
    });

    const stillInLogginPage = !!(await this.page.$(SELECTORS.USERNAME));
    if (stillInLogginPage) throw new CredentialsError(`Unsuccessfull Login.`);

    const notInMainMenu = !(await this.page.$(SELECTORS.STUDENT_MENU));
    if (notInMainMenu) throw new CredentialsError(`Not in Main Menu.`);
  }

  /**
   * Traverse to 'Quick Add or Drop Course Sections' on minerva once logged in.
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
    await this.page.waitForSelector(SELECTORS.CRN, { timeout });
  }

  /**
   * Attempt to register - inserts CRNs and submits changes.
   */
  public async attemptRegistration(): Promise<boolean> {
    const { timeout, registration } = this.config;

    await this.page.click(SELECTORS.CRN);
    await this.page.keyboard.type(registration.crn);

    const CRN_SUBMIT = await this.findSubmitBtnSelector();
    await this.page.click(CRN_SUBMIT);

    await this.page.waitForSelector(SELECTORS.CRN, { timeout }).catch(() =>
      this.page
        .waitForSelector(SELECTORS.REGISTRATION_LIMIT_ERROR, { timeout })
        .then(() => {
          throw new RegistrationError(`Registrations Exceeded.`);
        })
    );

    const registrationError = await this.page.$(SELECTORS.REGISTRATION_ERRORS);
    if (!!registrationError) return false;

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
   * Save new PDF file & info.
   * @param ftype
   * @param count
   * @param content
   */
  public async saveState(
    ftype: PDF,
    count: number,
    content: string
  ): Promise<void> {
    const { dirPath } = this.config;

    switch (ftype) {
      case "error":
        const errorpdf = `${dirPath}/error${count}.pdf`;
        const htmlfile = `${dirPath}/error${count}.html`;
        const html = await this.page.content();
        await this.page.pdf({ path: errorpdf, format: "A4" });
        await this.logger.saveHTMLfile(htmlfile, html);
        await this.logger.log(ftype, count, content, htmlfile);
        break;

      case "success":
        const successpdf = `${dirPath}/success${count}.pdf`;
        await this.page.pdf({ path: successpdf, format: "A4" });
        await this.logger.log(ftype, count, content);
        break;
      default:
    }
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
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const CRN_SUBMIT = `${SELECTORS.CRN_SUBMIT}(${i})`;
        const promise = waitForSelector(CRN_SUBMIT)
          .then((element) => {
            if (element && !resolved) {
              resolved = true;
              resolve(CRN_SUBMIT);
            }
          })
          .catch((error) => {});
        promises.push(promise);
      }

      await Promise.all(promises).catch(() => {});
      if (!resolved) reject(new Error(`No Submit Registration Found.`));
    });
  }
}

export default MinervaHandler;
