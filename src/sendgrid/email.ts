import sgMail from "@sendgrid/mail";
import { SendGridConfig } from "./types";

class EmailService {
  private config: SendGridConfig;

  /**
   * Constructor
   * @param config
   */
  constructor(config: SendGridConfig) {
    this.config = config;
    sgMail.setApiKey(config.sendGrid.apiKey);
  }

  /**
   * Send Error Message by Email
   * @param error
   */
  public async sendErrorEmail(error: Error): Promise<void> {
    const { enable, email } = this.config.sendGrid;
    if (!enable) return;

    const msg = {
      to: email,
      from: `registerer@minerva.com`,
      subject: `Minerva Registerer Critical Error`,
      text: error.stack,
      html: `<strong>${error.stack}</strong>`,
    };

    const [response] = await sgMail.send(msg);
    if (response.statusCode !== 202) throw new Error(`Sending error email.`);
    console.info(`Error Email sent.`);
  }

  /**
   * Send Success Message by Email
   * @param crn
   */
  public async sendSuccessEmail(crn: string): Promise<void> {
    const { enable, email } = this.config.sendGrid;
    if (!enable) return;

    const msg = {
      to: email,
      from: `registerer@minerva.com`,
      subject: `Registered to Course`,
      text: `Succesfully registerd to course with CRN: ${crn}`,
      html: `<strong>Succesfully registerd to course with CRN: ${crn}</strong>`,
    };

    const [response] = await sgMail.send(msg);
    if (response.statusCode !== 202) throw new Error(`Sending success email.`);
    console.info(`Success Email sent.`);
  }
}

export default EmailService;
