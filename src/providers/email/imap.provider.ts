import { ImapFlow, type ImapFlowOptions, type FetchMessageObject } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { EventEmitter } from "node:events";
import type {
  ParsedEmail,
  ParsedEmailAttachment,
} from "../../modules/incoming-email/incoming-email.service.js";

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  mailbox?: string;
}

export interface ImapProviderEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  email: (email: ParsedEmail) => void;
}

export class ImapProvider extends EventEmitter {
  private client: ImapFlow | null = null;
  private config: ImapConfig;
  private isConnected = false;
  private isListening = false;
  private mailboxLock: { release: () => void } | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private shouldReconnect = true;

  constructor(config: ImapConfig) {
    super();
    this.config = config;
  }

  private createClientOptions(): ImapFlowOptions {
    return {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.client = new ImapFlow(this.createClientOptions());

      this.client.on("close", () => {
        this.isConnected = false;
        this.isListening = false;
        this.mailboxLock = null; // Lock is invalid after disconnect
        this.emit("disconnected");

        if (this.shouldReconnect) {
          void this.reconnect();
        }
      });

      this.client.on("error", (err: Error) => {
        this.emit("error", err);
      });

      await this.client.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connected");
    } catch (error) {
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("error", new Error("Max reconnection attempts reached"));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `IMAP: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (this.shouldReconnect) {
      await this.connect();

      // Restart listening if we were listening before
      if (this.isConnected && this.config.mailbox) {
        await this.startListening(this.config.mailbox);
      }
    }
  }

  async startListening(mailbox = "INBOX"): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error("Not connected to IMAP server");
    }

    if (this.isListening) {
      return;
    }

    this.config.mailbox = mailbox;
    this.mailboxLock = await this.client.getMailboxLock(mailbox);

    try {
      this.isListening = true;

      // Listen for new emails using the 'exists' event
      this.client.on("exists", async (data: { count: number; prevCount: number }) => {
        // Only fetch new messages (count > prevCount means new message arrived)
        if (data.count > data.prevCount) {
          await this.fetchLatestEmail(data.count);
        }
      });

      // Start IDLE mode to wait for new emails
      // Note: IDLE will automatically be restarted by ImapFlow
      console.log(`IMAP: Listening for new emails in ${mailbox}`);
    } catch (error) {
      this.isListening = false;
      this.mailboxLock?.release();
      this.mailboxLock = null;
      throw error;
    }
  }

  private async fetchLatestEmail(seq: number): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const message = await this.client.fetchOne(String(seq), {
        source: true,
        flags: true,
        envelope: true,
      });

      // fetchOne returns false if message not found
      if (message === false) {
        return;
      }

      if (message.source) {
        const parsed = await this.parseEmail(message);
        this.emit("email", parsed);
      }
    } catch (error) {
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async parseEmail(message: FetchMessageObject): Promise<ParsedEmail> {
    if (!message.source) {
      throw new Error("Message source is required for parsing");
    }

    const parsed = await simpleParser(message.source);

    const result: ParsedEmail = {
      messageId: this.extractMessageId(parsed),
      from: this.extractFromAddress(parsed),
      to: this.extractAddresses(parsed.to),
      receivedAt: parsed.date ?? new Date(),
      metadata: {
        uid: message.uid,
        flags: message.flags ? Array.from(message.flags) : [],
      },
    };

    // Add optional fields only if they have values
    const ccAddresses = this.extractAddresses(parsed.cc);
    if (ccAddresses.length > 0) {
      result.cc = ccAddresses;
    }
    if (parsed.subject !== undefined) {
      result.subject = parsed.subject;
    }
    if (parsed.text !== undefined) {
      result.textBody = parsed.text;
    }
    if (parsed.html) {
      result.htmlBody = parsed.html;
    }

    const attachments = this.extractAttachments(parsed);
    if (attachments.length > 0) {
      result.attachments = attachments;
    }

    return result;
  }

  private extractMessageId(parsed: ParsedMail): string {
    // Use the Message-ID header if available, otherwise generate one
    if (parsed.messageId) {
      return parsed.messageId;
    }
    return `generated-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private extractFromAddress(parsed: ParsedMail): string {
    if (!parsed.from) {
      return "";
    }
    const addresses = parsed.from.value;
    if (addresses && addresses.length > 0) {
      const firstAddress = addresses[0];
      return firstAddress?.address ?? "";
    }
    return "";
  }

  private extractAddresses(field: ParsedMail["to"] | ParsedMail["cc"]): string[] {
    if (!field) {
      return [];
    }

    // Handle array of address objects
    if (Array.isArray(field)) {
      return field.flatMap((addr) => addr.value.map((v) => v.address || "").filter(Boolean));
    }

    // Handle single address object
    return field.value.map((v) => v.address || "").filter(Boolean);
  }

  private extractAttachments(parsed: ParsedMail): ParsedEmailAttachment[] {
    if (!parsed.attachments || parsed.attachments.length === 0) {
      return [];
    }

    return parsed.attachments.map((att) => ({
      filename: att.filename || "unknown",
      contentType: att.contentType,
      size: att.size,
      // Note: We don't store the content buffer here
      // Implement attachment storage (e.g., S3) and set storagePath
    }));
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.isListening = false;

    // Release mailbox lock if held
    if (this.mailboxLock) {
      this.mailboxLock.release();
      this.mailboxLock = null;
    }

    if (this.client && this.isConnected) {
      try {
        await this.client.logout();
      } catch {
        // Ignore logout errors during disconnect
      }
      this.isConnected = false;
    }
  }

  getConnectionStatus(): { connected: boolean; listening: boolean } {
    return {
      connected: this.isConnected,
      listening: this.isListening,
    };
  }
}
