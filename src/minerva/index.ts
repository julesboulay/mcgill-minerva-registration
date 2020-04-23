import { TimeoutError } from "puppeteer/Errors";
import {
  MinervaConfig,
  LoggedOutError,
  Counts,
  CredentialsError,
  Times,
  CriticalError,
  RegistrationError,
  PDF,
} from "./types";
import { CMND_LINE, waitfor, internetNotConnected, timenow } from "./util";
import MinervaHandler from "./handler";

class MinervaRegisterer {
  private config: MinervaConfig;
  private counts: Counts;
  private hdlr: MinervaHandler;

  /**
   * Constructor.
   * @param config
   */
  constructor(config: MinervaConfig, debug?: boolean) {
    this.config = config;
    this.hdlr = new MinervaHandler(config, debug);
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
    const { errorsToleratedLimit, timeoutBetweenErrors, registration } = config;

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
        /* Handle Logout & Timeout Error */
        if (error instanceof LoggedOutError) {
          console.error(error);
          return false;
        } else if (error instanceof TimeoutError) {
          console.error(error);
          return false;
        }

        /* Handle Critical Error */
        if (error instanceof CredentialsError) {
          await this.cleanup("error", ++counts.errors, error);
          throw new CriticalError(`Incorrect Credentials.`, error.stack);
        } else if (error instanceof RegistrationError) {
          await this.cleanup("error", ++counts.errors, error);
          throw new CriticalError(`Minerva Internal Error.`, error.stack);
        }

        /* Handle UnExpected Error */
        if (++counts.errors > errorsToleratedLimit) {
          await this.cleanup(error, counts.errors);
          throw new CriticalError(`Error Limit Reached.`, error);
        } else if (error instanceof Error) {
          console.error(error);
          await this.cleanup("error", counts.errors, error);
          return false;
        } else {
          console.log(error);
          const msg = typeof error === "string" ? error : ``;
          const nerror = new Error(`Unspecified Error: ${msg}`);
          await this.cleanup("error", counts.errors, nerror);
          return false;
        }
      });

      /* Sleep in Between Errors */
      if (!registered) await waitfor(timeoutBetweenErrors, Times.Min);
    }

    await this.cleanup("success", ++counts.successes);
    return registered;
  }

  /**
   * Logs in to Minerva and attempts to register for given CRN at
   * given time interval until logged out, network failure, or
   * unexpected error.
   */
  private async register(): Promise<boolean> {
    const { counts, config } = this;
    const { timeoutBetweenAttempts } = config;

    /* Login to Minerva & Traverse to Registration Page */
    await this.hdlr.init();
    await this.hdlr.newMinervaPage();
    await this.hdlr.login();
    await this.hdlr.traverseToRegistrationPage();
    console.info(`Successfully logged in. (#${++counts.logins})`);

    /* Attemp Registrations at Specified Time (attemps) Interval */
    let successfull: boolean = false;
    while (!successfull) {
      console.info(`Attempt: #${++counts.attempts} -- ${timenow()}`);

      /* Insert & Submit CRN & */
      successfull = await this.hdlr
        .attemptRegistration()
        .catch(async (error) => {
          if (error instanceof CredentialsError) throw error;
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
   * Print & Save Error (as pdf of current page) as well as Close
   * Browser and Page if still active.
   * @param ftype
   * @param count
   * @param error
   */
  private async cleanup(
    ftype: PDF,
    count: number,
    error?: Error
  ): Promise<void> {
    const { crn } = this.config.registration;

    switch (ftype) {
      case "error":
        if (error instanceof Error)
          await this.hdlr
            .saveState("error", count, error.stack)
            .catch(() => {});
        break;

      case "success":
        await this.hdlr.saveState("success", count, crn).catch(() => {});
        break;
      default:
    }

    await this.hdlr.destroy().catch(() => {});
  }
}

export default MinervaRegisterer;
