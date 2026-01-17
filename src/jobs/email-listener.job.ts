import { ImapProvider } from "../providers/email/imap.provider.js";
import {
  incomingEmailService,
  type ParsedEmail,
} from "../modules/incoming-email/incoming-email.service.js";
import { env } from "../env.js";

let imapProvider: ImapProvider | null = null;

/**
 * Start the IMAP email listener
 * Connects to the configured IMAP server and listens for new emails
 */
export async function startEmailListener(): Promise<void> {
  // Skip if IMAP is not configured
  if (!env.IMAP_HOST || !env.IMAP_USER || !env.IMAP_PASS) {
    console.log("IMAP: Credentials not configured, skipping email listener");
    return;
  }

  imapProvider = new ImapProvider({
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    secure: true,
    auth: {
      user: env.IMAP_USER,
      pass: env.IMAP_PASS,
    },
    mailbox: env.IMAP_MAILBOX,
  });

  imapProvider.on("connected", () => {
    console.log("IMAP: Connected to server");
  });

  imapProvider.on("disconnected", () => {
    console.log("IMAP: Disconnected from server");
  });

  imapProvider.on("error", (error: Error) => {
    console.error("IMAP: Error:", error.message);
  });

  imapProvider.on("email", async (email: ParsedEmail) => {
    console.log(`IMAP: New email from ${email.from}: ${email.subject ?? "(no subject)"}`);

    try {
      await incomingEmailService.processEmail(email);
      console.log(`IMAP: Email ${email.messageId} processed successfully`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log(`IMAP: Email ${email.messageId} already processed, skipping`);
      } else {
        console.error(`IMAP: Failed to process email ${email.messageId}:`, error);
      }
    }
  });

  await imapProvider.connect();
  await imapProvider.startListening(env.IMAP_MAILBOX);
}

/**
 * Stop the IMAP email listener
 * Gracefully disconnects from the IMAP server
 */
export async function stopEmailListener(): Promise<void> {
  if (imapProvider) {
    console.log("IMAP: Stopping email listener...");
    await imapProvider.disconnect();
    imapProvider = null;
    console.log("IMAP: Email listener stopped");
  }
}

/**
 * Get the current status of the email listener
 */
export function getEmailListenerStatus(): { connected: boolean; listening: boolean } | null {
  if (!imapProvider) {
    return null;
  }
  return imapProvider.getConnectionStatus();
}
