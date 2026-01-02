import { env } from "../env.js";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}

/**
 * Console email provider for development
 * Replace with AWS SES, Resend, or other provider in production
 */
class ConsoleEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<void> {
    console.log("Email sent (console provider):");
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Body: ${options.text ?? options.html.slice(0, 100)}...`);
  }
}

/**
 * AWS SES email provider stub
 * Implement when AWS credentials are configured
 */
class SESEmailProvider implements EmailProvider {
  async send(_options: SendEmailOptions): Promise<void> {
    // TODO: Implement AWS SES
    // const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
    //
    // const client = new SESClient({
    //   region: env.AWS_REGION,
    //   credentials: {
    //     accessKeyId: env.AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    //   },
    // });
    //
    // await client.send(new SendEmailCommand({
    //   Source: "noreply@yourdomain.com",
    //   Destination: { ToAddresses: [_options.to] },
    //   Message: {
    //     Subject: { Data: _options.subject },
    //     Body: {
    //       Html: { Data: _options.html },
    //       Text: _options.text ? { Data: _options.text } : undefined,
    //     },
    //   },
    // }));

    throw new Error("SES email provider not implemented");
  }
}

// Export provider based on environment
export const emailProvider: EmailProvider =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? new SESEmailProvider()
    : new ConsoleEmailProvider();
