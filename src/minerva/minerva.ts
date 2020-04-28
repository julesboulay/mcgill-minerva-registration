import { TimeoutError } from "puppeteer/Errors";
import { Credentials, CriticalError, Handler } from "./types";
import { SELECTORS, MINERVA_URL } from "./util";

class MinervaHandler extends Handler {
  /**
   * Login to minerva given config credentials.
   * @param credentials
   */
  public async login(creds: Credentials): Promise<void> {
    await this.page.click(SELECTORS.USERNAME);
    await this.page.keyboard.type(creds.username);

    await this.page.click(SELECTORS.PASSWORD);
    await this.page.keyboard.type(creds.password);

    await this.page.click(SELECTORS.LOGIN_BUTTON);
    await this.page.waitForNavigation().catch((error) => {
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
    await this.page.click(SELECTORS.STUDENT_MENU);
    await this.page.waitForSelector(SELECTORS.REGISTRATION_MENU);

    await this.page.click(SELECTORS.REGISTRATION_MENU);
    await this.page.waitForSelector(SELECTORS.QUICK_ADD_COURSE);

    await this.page.click(SELECTORS.QUICK_ADD_COURSE);
    await this.page.waitForSelector(SELECTORS.SELECT_TERM);

    await this.page.select(SELECTORS.SELECT_TERM, term);
    await this.page.click(SELECTORS.SUBMIT_TERM);
    await this.page.waitForSelector(SELECTORS.CRN);
  }

  /**
   * Attempt to register - inserts CRNs and submits changes.
   * @param crn
   */
  public async attemptRegistration(crn: string): Promise<boolean> {
    /* Insert CRN */
    await this.page.click(SELECTORS.CRN);
    await this.page.keyboard.type(crn);

    /* Submit CRN */
    const CRN_SUBMIT = await this.findSubmitBtnSelector();
    await this.page.click(CRN_SUBMIT);

    /* Check if Registrations not Exceeded */
    await this.page.waitForSelector(SELECTORS.CRN).catch(async (error) => {
      await this.page
        .waitForSelector(SELECTORS.REGISTRATION_LIMIT_ERROR)
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
    let loggedOut: boolean = false;

    await this.page.waitForNavigation().catch(() => {});
    const checkIfbreakedIn = this.page
      .waitForSelector(SELECTORS.BREAK_IN)
      .then(() => {
        loggedOut = true;
      })
      .catch(() => {});
    const checkIfInLoginPage = this.page
      .waitForSelector(SELECTORS.USERNAME)
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
}

export default MinervaHandler;
