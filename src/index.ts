import { Config, envConfig } from "./config";
import MinervaRegisterer from "./minerva";
import EmailService from "./sendgrid";

/**
 * TODO
 * - support multiple CRNs
 * - stop attempting upon succcess (bug)
 */

/**
 * main
 */
async function main(): Promise<void> {
  console.info(`-- Starting McGill Minerva Registration System --`);

  /* Init Config */
  const config: Config = envConfig();
  console.info({
    Username: config.minerva.credentials.username,
    Term: config.minerva.registration.termStr,
    CRN: config.minerva.registration.crn,
    TimeBetweenAttemps: `${config.minerva.timeoutBetweenAttempts} secs`,
    TimeBetweenErrors: `${config.minerva.timeoutBetweenErrors} mins`,
  });

  /* Init Email Service */
  const emailService = new EmailService(config.sendgrid);

  /* Init Minerva Registration System */
  const registerer = new MinervaRegisterer(config.minerva);

  /* Start Registration System */
  await registerer
    .start()
    .then(async (registered) => {
      console.info(`-- Successfully Registered --`);
      if (registered)
        await emailService.sendSuccessEmail(config.minerva.registration.crn);
    })
    .catch(async (error) => {
      if (error instanceof Error) await emailService.sendErrorEmail(error);
      throw error;
    });
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(() => {
    console.info(`Safe System Exit.`);
    process.exit();
  });
