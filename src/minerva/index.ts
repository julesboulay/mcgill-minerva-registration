import {
  MinervaConfig,
  LoggedOutError,
  Counts,
  Times,
  CriticalError,
  PDF,
  Handler,
} from "./types";
import {
  CMND_LINE,
  waitfor,
  internetNotConnected,
  timenow,
  MINERVA_URL,
  VSB_URL,
} from "./util";
import MinervaHandler from "./minerva";
import Logger from "./logger";
import VSBHandler from "./vsb";

class MinervaRegisterer {
  private readonly minerva: MinervaHandler;
  private readonly vsb: VSBHandler;
  private readonly logger: Logger;
  private readonly counts: Counts;

  /**
   * Constructor.
   * @param config
   */
  constructor(private config: MinervaConfig) {
    this.minerva = new MinervaHandler(config.timeout, MINERVA_URL);
    this.vsb = new VSBHandler(config.timeout, VSB_URL);
    this.logger = new Logger(config.dirPath);
    this.counts = {
      checks: 0,
      logins: 0,
      attempts: 0,
      errors: 0,
      successes: 0,
    };
  }

  /**
   * Attempts to register to class until class has been succesfully registered to.
   * Creates a headless browser to login to Minerva and attempt registration. Upon
   * logouts or network interuptions, system is put to sleep for specified time.
   */
  public async start(): Promise<boolean> {
    const { counts, config } = this;
    const { timeoutBetweenErrors } = config;
    this.logger.init();

    /* Retry Registration Until Successfull or Error Condtion Met */
    let registered: boolean = false;
    let available: boolean = false;
    while (!registered) {
      console.info(CMND_LINE);

      /* Check Internet Connection */
      if (await internetNotConnected()) {
        await waitfor(timeoutBetweenErrors, Times.Min);
        continue;
      }

      /* Check VSB for Course Availability */
      available = await this.waitForAvailability().catch(async (error) => {
        if (error instanceof CriticalError) {
          await this.saveState("vsb", "error", error.stack);
          await this.cleanup();
          throw error;
        }

        return this.unexpected("vsb", error);
      });
      if (!available) continue;

      /* Attempt to Login to Minerva and Register to Course */
      registered = await this.register().catch(async (error) => {
        if (error instanceof LoggedOutError) {
          console.error(error);
          return false;
        } else if (error instanceof CriticalError) {
          await this.saveState("minerva", "error", error.stack);
          await this.cleanup();
          throw error;
        }

        return this.unexpected("minerva", error);
      });

      /* Sleep in Between Errors */
      if (!registered) await waitfor(timeoutBetweenErrors, Times.Min);
    }

    await this.cleanup();
    return registered;
  }

  /**
   * Visits VSB and checks for a course availability by refreshing
   * page at given time interval until network failure, or unexpected
   * error.
   */
  private async waitForAvailability(): Promise<boolean> {
    const { config, counts } = this;
    const { timeoutBetweenRefreshs, registration } = config;

    /* Goto VSB & Select Term & Course */
    await this.vsb.init();
    await this.vsb.gotoVSBpage();
    await this.vsb.selectTerm(registration.term);
    await this.vsb.selectCourse(registration.crn);

    /* Check Course Availability at Specified Time Interval */
    let available: boolean = false;
    while (!available) {
      console.info(`VSB Attempt: #${++counts.checks} -- ${timenow()}`);

      /* Refresh Page & Check If Not Full & */
      available = await this.vsb.checkIfAvailableSeat();

      /* Sleep in Between Attempts */
      if (!available) await waitfor(timeoutBetweenRefreshs, Times.Sec);
    }

    counts.successes++;
    await this.saveState("vsb", "success", config.registration.crn);
    return available;
  }

  /**
   * Logs in to Minerva and attempts to register for given CRN at
   * given time interval until logged out, network failure, or
   * unexpected error.
   */
  private async register(): Promise<boolean> {
    const { counts, config } = this;
    const { timeoutBetweenAttempts, credentials, registration } = config;

    /* Login to Minerva & Traverse to Registration Page */
    await this.minerva.init();
    await this.minerva.login(credentials);
    await this.minerva.gotoRegistrationPage(registration.term);
    console.info(`Successfully logged in. (#${++counts.logins})`);

    /* Attemp Registrations at Specified Time (attemps) Interval */
    let registered: boolean = false;
    for (let attempts = 0; attempts < 5; attempts++) {
      console.info(`REG Attempt: #${++counts.attempts} -- ${timenow()}`);

      /* Insert & Submit CRN */
      registered = await this.minerva
        .attemptRegistration(registration.crn)
        .catch(async (error) => {
          if (error instanceof CriticalError) throw error;
          if (await this.minerva.loggedOut())
            throw new LoggedOutError(`Logged Out.`, error);
          throw error;
        });

      /* Sleep in Between Attempts */
      if (registered) break;
      if (!registered && attempts !== 1)
        await waitfor(timeoutBetweenAttempts, Times.Sec);
    }

    counts.successes++;
    await this.saveState("minerva", "success", config.registration.crn);
    return registered;
  }

  /**
   * Handles unexpected VSB or Minerva Error.
   * @param page
   * @param error
   */
  private async unexpected(
    page: "vsb" | "minerva",
    error: any
  ): Promise<boolean> {
    const { counts, config } = this;
    const nerror =
      error instanceof Error
        ? error
        : new Error(`Unexpected Error: ${JSON.stringify(error)}`);
    if (++counts.errors > config.errorsToleratedLimit) {
      await this.saveState(page, "error", nerror.stack);
      await this.cleanup();
      throw new CriticalError(`Error Limit Reached.`, nerror);
    } else {
      console.error(nerror);
      await this.saveState(page, "error", nerror.stack);
      await this.cleanup();
      return false;
    }
  }

  /**
   * Save new PDF file & info.
   * @param page
   * @param ftype
   * @param content
   */
  private async saveState(
    page: "vsb" | "minerva",
    ftype: PDF,
    content: string
  ): Promise<void> {
    const { config, vsb, minerva, counts } = this;
    const hndlr: Handler = page === "vsb" ? vsb : minerva;
    const { dirPath } = config;
    let count: number = 0;

    switch (ftype) {
      case "error":
        count = counts.errors;
        await hndlr.savePDF(`${dirPath}/error${count}.pdf`);
        await this.logger.saveState(ftype, count, content);
        break;

      case "success":
        count = counts.successes;
        await hndlr.savePDF(`${dirPath}/success${count}.pdf`);
        await this.logger.saveState(ftype, count, content);
        break;
      default:
    }
  }

  /**
   * Clean up page handlers.
   */
  private async cleanup(): Promise<void> {
    await this.vsb.destroy();
    await this.minerva.destroy();
  }
}

export default MinervaRegisterer;
