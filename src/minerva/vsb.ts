import { SELECTORS } from "./util";
import { Handler } from "./types";
import { isString } from "util";

class VSBHandler extends Handler {
  /**
   * Traverse to main VSB page.
   */
  public async gotoVSBpage(): Promise<void> {
    await this.page.waitForSelector(SELECTORS.CONTINUE1);
    await this.page.click(SELECTORS.CONTINUE1);
    await this.page.waitForNavigation();

    await this.page.waitForSelector(SELECTORS.CONTINUE2);
    await this.page.click(SELECTORS.CONTINUE2);
  }

  /**
   * Select Term
   * @param term
   */
  public async selectTerm(term: string): Promise<void> {
    /* Select Term */
    await this.page.waitForSelector(`${SELECTORS.SELECT_TERM_VSB}${term}`);
    await this.page.click(`${SELECTORS.SELECT_TERM_VSB}${term}`);
  }

  /**
   * Traverse to 'Quick Add or Drop Course Sections' on minerva from 'Main Menu'.
   * @param crn
   */
  public async selectCourse(crn: string): Promise<void> {
    /* Search Course */
    await this.page.waitForSelector(SELECTORS.SEARCH_COURSE);
    await this.page.click(SELECTORS.SEARCH_COURSE);
    await this.page.keyboard.type(crn);

    /* Submit Search Course */
    await this.page.waitForSelector(SELECTORS.SUBMIT_COURSE_SEARCH);
    await this.page.click(SELECTORS.SUBMIT_COURSE_SEARCH);

    /* Wait for Course Info */
    const COURSE_INFO = SELECTORS.LIST_COURSE_INFO.replace(`INDEX`, `${3}`);
    await this.page.waitForSelector(COURSE_INFO);
  }

  /**
   * Traverse to 'Quick Add or Drop Course Sections' on minerva from 'Main Menu'.
   * @param term
   */
  public async checkIfAvailableSeat(): Promise<boolean> {
    const COURSE_INFO = SELECTORS.LIST_COURSE_INFO.replace(`INDEX`, `${3}`);
    const COURSE_FULL = SELECTORS.LIST_COURSE_FULL.replace(`INDEX`, `${3}`);

    /* Reload Page */
    await this.page.reload({ waitUntil: "networkidle2" });
    await this.page.waitForSelector(COURSE_INFO);

    /* Check Availability */
    const element = await this.page.$(COURSE_FULL);
    const value = await this.page.evaluate((el) => el.textContent, element);

    const seatAvailable = isString(value) && !value.includes("full");
    if (seatAvailable) return true;
    return false;
  }
}

export default VSBHandler;
