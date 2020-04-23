import sgMail from "@sendgrid/mail";
import { SendGridConfig } from "./types";

class EmailService {
  /**
   * Constructor
   * @param config
   */
  constructor(private readonly config: SendGridConfig) {
    sgMail.setApiKey(config.apiKey);
  }

  /**
   * Send error email.
   * @param error
   */
  public async sendErrorEmail(error: Error): Promise<void> {
    const { enable, toEmail, fromEmail } = this.config;
    if (!enable) return;

    const text = `${error.stack}`;
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: `Minerva Registerer: Critical Error`,
      text,
      html: `<strong>${text}</strong>`,
    };

    const [response] = await sgMail.send(msg);
    if (response.statusCode !== 202) throw new Error(`Sending error email.`);
    console.info(`Error Email sent.`);
  }

  /**
   * Send success email.
   * @param crn
   */
  public async sendSuccessEmail(crn: string): Promise<void> {
    const { enable, toEmail, fromEmail } = this.config;
    if (!enable) return;

    const text = `Succesfully registered to course with CRN: ${crn}`;
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: `Minerva Registerer: Registration Success`,
      text,
      html: `<strong>${text}</strong>`,
    };

    const [response] = await sgMail.send(msg);
    if (response.statusCode !== 202) throw new Error(`Sending success email.`);
    console.info(`Success Email sent.`);
  }
}

export default EmailService;
