import {
  MinervaConfig,
  LoggedOutError,
  Counts,
  Times,
  CriticalError,
  PDF,
} from "./types";
import { CMND_LINE, waitfor, internetNotConnected, timenow } from "./util";
import MinervaHandler from "./handler";
import Logger from "./logger";

class MinervaRegisterer {
  private readonly hdlr: MinervaHandler;
  private readonly logger: Logger;
  private readonly counts: Counts;

  /**
   * Constructor.
   * @param config
   */
  constructor(private config: MinervaConfig) {
    this.hdlr = new MinervaHandler(config.timeout);
    this.logger = new Logger(config.dirPath);
    this.counts = {
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
    const { errorsToleratedLimit, timeoutBetweenErrors } = config;

    /* Retry Registration Until Successfull or Error Condtion Met */
    let registered: boolean = false;
    while (!registered) {
      console.info(CMND_LINE);

      /* Check Internet Connection */
      if (await internetNotConnected()) {
        await waitfor(timeoutBetweenErrors, Times.Min);
        continue;
      }

      /**
       * Attempt to Login to Minerva and Register to Course at
       * Specified Time (errors) Interval
       */
      registered = await this.register().catch(async (error) => {
        /* Handle Critical & Logout Error */
        if (error instanceof LoggedOutError) {
          console.error(error);
          return false;
        } else if (error instanceof CriticalError) {
          await this.saveError(error);
          throw error;
        }

        /* Handle Unexpected Error */
        const nerror =
          error instanceof Error
            ? error
            : new Error(`Unexpected Error: ${JSON.stringify(error)}`);
        if (++counts.errors > errorsToleratedLimit) {
          await this.saveError(error);
          throw new CriticalError(`Error Limit Reached.`, nerror);
        } else {
          console.error(nerror);
          return false;
        }
      });

      /* Sleep in Between Errors */
      if (!registered) await waitfor(timeoutBetweenErrors, Times.Min);
    }

    await this.hdlr.destroy();
    await this.saveState("success", config.registration.crn);
    return registered;
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
    await this.hdlr.init();
    await this.hdlr.login(credentials);
    await this.hdlr.gotoRegistrationPage(registration.term);
    console.info(`Successfully logged in. (#${++counts.logins})`);

    /* Attemp Registrations at Specified Time (attemps) Interval */
    let successfull: boolean = false;
    while (!successfull) {
      console.info(`Attempt: #${++counts.attempts} -- ${timenow()}`);

      /* Insert & Submit CRN & */
      successfull = await this.hdlr
        .attemptRegistration(registration.crn)
        .catch(async (error) => {
          if (error instanceof CriticalError) throw error;
          if (await this.hdlr.loggedOut())
            throw new LoggedOutError(`Logged Out.`, error);
          throw error;
        });

      /* Sleep in Between Attempts */
      if (!successfull) await waitfor(timeoutBetweenAttempts, Times.Sec);
    }

    return successfull;
  }

  /**
   * Print & Save Error (as pdf of current page).
   * @param error
   */
  private async saveError(error: Error): Promise<void> {
    await this.saveState("error", error.stack);
  }

  /**
   * Save new PDF file & info.
   * @param ftype
   * @param content
   */
  private async saveState(ftype: PDF, content: string): Promise<void> {
    const { counts, config } = this;
    const { dirPath } = config;
    let count: number;

    switch (ftype) {
      case "error":
        await this.hdlr.savePDF(`${dirPath}/error${count}.pdf`);
        await this.logger.saveState(ftype, count, content);
        break;

      case "success":
        await this.hdlr.savePDF(`${dirPath}/success${count}.pdf`);
        await this.logger.saveState(ftype, count, content);
        break;
      default:
    }
  }
}

export default MinervaRegisterer;
