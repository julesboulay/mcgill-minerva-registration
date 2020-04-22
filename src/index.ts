import { Config, envConfig } from "./config";
import MinervaRegisterer from "./minerva/registerer";
import EmailService from "./sendgrid/email";

/**
 * main
 * @param config
 */
async function main(): Promise<void> {
  /* Init Config */
  const config: Config = envConfig();
  console.info({
    Username: config.credentials.username,
    Term: config.registration.termStr,
    CRN: config.registration.crn,
    TimeBetweenAttemps: `${config.timeoutBetweenAttempts} secs`,
  });

  /* Init EmailService */
  const emailService = new EmailService(config);

  /* Init Registerer */
  const registerer = new MinervaRegisterer(config);

  /* Start Segisterer */
  await registerer
    .start()
    .then(async (registered) => {
      if (registered) await emailService.sendSuccessEmail(``);
    })
    .catch(async (error) => {
      if (error instanceof Error) await emailService.sendErrorEmail(error);
      throw error;
    });
}

main().catch((error) => {
  console.log(error);
  console.log(`Safe exit.`);
});
