import type { CreateEmailOptions } from "resend";
import { Resend } from "resend";
import { env } from "../env.js";

export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface ResendProvider {
  send(options: SendEmailOptions): Promise<{ id: string }>;
}

/**
 * Console Resend provider for development
 * Replace with Resend SDK in production
 */
class ConsoleResendProvider implements ResendProvider {
  async send(options: SendEmailOptions): Promise<{ id: string }> {
    console.log("Email sent (console provider):");
    console.log(`  From: ${options.from}`);
    console.log(`  To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Body: ${options.text ?? options.html?.slice(0, 100) ?? "(empty)"}...`);

    return { id: crypto.randomUUID() };
  }
}

/** Resend SDK provider for production */
class SDKResendProvider implements ResendProvider {
  private client = new Resend(env.RESEND_API_KEY);

  async send(options: SendEmailOptions): Promise<{ id: string }> {
    const payload = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      ...(options.html != null && { html: options.html }),
      ...(options.text != null && { text: options.text }),
      ...(options.replyTo != null && { replyTo: options.replyTo }),
      ...(options.cc != null && { cc: options.cc }),
      ...(options.bcc != null && { bcc: options.bcc }),
    } as CreateEmailOptions;

    const { data, error } = await this.client.emails.send(payload);

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    if (!data) {
      throw new Error("Resend API returned no data");
    }

    return { id: data.id };
  }
}

// Export provider based on environment
export const resendProvider: ResendProvider = env.RESEND_API_KEY
  ? new SDKResendProvider()
  : new ConsoleResendProvider();
