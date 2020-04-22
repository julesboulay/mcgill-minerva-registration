/***********************************************************************
 * TYPES
 */

type SendGrid = {
  readonly enable: boolean;
  readonly apiKey: string;
  readonly email: string;
};

type SendGridConfig = {
  readonly sendGrid: SendGrid;
};

export { SendGrid, SendGridConfig };
