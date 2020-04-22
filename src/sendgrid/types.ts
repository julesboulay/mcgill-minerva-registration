/***********************************************************************
 * TYPES
 */

type SendGridConfig = {
  readonly enable: boolean;
  readonly apiKey?: string;

  readonly toEmail?: string;
  readonly fromEmail?: string;
};

export { SendGridConfig };
