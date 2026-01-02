import { env } from "../env.js";

export interface SendSMSOptions {
  to: string;
  body: string;
}

export interface SMSProvider {
  send(options: SendSMSOptions): Promise<void>;
}

/**
 * Console SMS provider for development
 * Replace with Twilio or other provider in production
 */
class ConsoleSMSProvider implements SMSProvider {
  async send(options: SendSMSOptions): Promise<void> {
    console.log("SMS sent (console provider):");
    console.log(`  To: ${options.to}`);
    console.log(`  Body: ${options.body}`);
  }
}

/**
 * Twilio SMS provider stub
 * Implement when Twilio credentials are configured
 */
class TwilioSMSProvider implements SMSProvider {
  async send(_options: SendSMSOptions): Promise<void> {
    // TODO: Implement Twilio
    // const twilio = await import("twilio");
    //
    // const client = twilio.default(
    //   env.TWILIO_ACCOUNT_SID,
    //   env.TWILIO_AUTH_TOKEN
    // );
    //
    // await client.messages.create({
    //   to: _options.to,
    //   from: env.TWILIO_PHONE_NUMBER,
    //   body: _options.body,
    // });

    throw new Error("Twilio SMS provider not implemented");
  }
}

// Export provider based on environment
export const smsProvider: SMSProvider =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? new TwilioSMSProvider()
    : new ConsoleSMSProvider();
