import { Config, envConfig } from "./config";
import MinervaRegisterer from "./minerva";
import EmailService from "./sendgrid";

/**
 * TODO
 * - support multiple CRNs
 * - test email service
 */

/**
 * main
 */
async function main(): Promise<void> {
  /* Init Config */
  const config: Config = envConfig();
  console.info({
    Username: config.minerva.credentials.username,
    Term: config.minerva.registration.termStr,
    CRN: config.minerva.registration.crn,
    TimeBetweenAttemps: `${config.minerva.timeoutBetweenAttempts} secs`,
  });

  /* Init Email Service */
  const emailService = new EmailService(config.sendgrid);

  /* Init Minerva Registerer */
  const registerer = new MinervaRegisterer(config.minerva);

  /* Start Registerer */
  await registerer
    .start()
    .then(async (registered) => {
      if (registered)
        await emailService.sendSuccessEmail(config.minerva.registration.crn);
    })
    .catch(async (error) => {
      if (error instanceof Error) await emailService.sendErrorEmail(error);
      throw error;
    });
}

main().catch((error) => {
  console.error(error);
  console.error(`Safe System Exit`);
});
