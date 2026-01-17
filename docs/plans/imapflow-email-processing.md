# ImapFlow Email Processing Implementation Plan

## Overview

Implement a service to receive and process incoming emails from any IMAP-compatible email provider (Gmail, Outlook, Yahoo, custom mail servers) using ImapFlow with IDLE support for real-time notifications.

## Goals

- Connect to one or more email accounts via IMAP
- Listen for new emails in real-time using IDLE (no polling)
- Parse email content (from, to, subject, body, attachments)
- Process emails through customizable handlers
- Store email metadata in database for tracking
- Handle reconnection and error recovery gracefully

## Dependencies

```bash
pnpm add imapflow mailparser
pnpm add -D @types/mailparser
```

| Package | Purpose |
|---------|---------|
| `imapflow` | Modern IMAP client with IDLE support |
| `mailparser` | Parse raw email into structured objects |

## Architecture

```
src/
├── providers/
│   └── email/
│       ├── imap.provider.ts      # ImapFlow connection manager
│       ├── email-parser.ts       # Email parsing utilities
│       └── types.ts              # TypeScript interfaces
├── modules/
│   └── incoming-email/
│       ├── incoming-email.service.ts    # Business logic
│       ├── incoming-email.handler.ts    # Email processing handlers
│       └── incoming-email.dto.ts        # Data transfer objects
└── jobs/
    └── email-listener.job.ts     # Background job for IMAP connection
```

## Database Schema

Add to `prisma/schema.prisma`:

```prisma
model IncomingEmail {
  id            String   @id @default(cuid())
  messageId     String   @unique
  from          String
  to            String[]
  cc            String[]
  subject       String?
  textBody      String?
  htmlBody      String?
  receivedAt    DateTime
  processedAt   DateTime?
  status        IncomingEmailStatus @default(PENDING)
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  attachments   EmailAttachment[]

  @@index([status])
  @@index([from])
  @@index([receivedAt])
}

model EmailAttachment {
  id              String   @id @default(cuid())
  incomingEmailId String
  filename        String
  contentType     String
  size            Int
  storagePath     String?  // S3/local path if stored
  createdAt       DateTime @default(now())

  incomingEmail   IncomingEmail @relation(fields: [incomingEmailId], references: [id], onDelete: Cascade)

  @@index([incomingEmailId])
}

enum IncomingEmailStatus {
  PENDING
  PROCESSING
  PROCESSED
  FAILED
}
```

## Implementation Steps

### Phase 1: Core IMAP Provider

1. **Create types and interfaces**
   - `ImapConfig` - connection configuration
   - `ParsedEmail` - parsed email structure
   - `EmailHandler` - handler interface

2. **Implement ImapFlow provider**
   - Connection management
   - Reconnection with exponential backoff
   - IDLE listener for new emails
   - Graceful shutdown

3. **Implement email parser**
   - Parse raw email using `mailparser`
   - Extract structured data
   - Handle attachments

### Phase 2: Email Processing Service

4. **Create incoming email service**
   - Save emails to database
   - Prevent duplicate processing (by messageId)
   - Update email status

5. **Create email handlers**
   - Handler registry pattern
   - Route emails to appropriate handlers
   - Support multiple handlers per email

### Phase 3: Background Job

6. **Create email listener job**
   - Start IMAP connection on app boot
   - Handle connection lifecycle
   - Integrate with graceful shutdown

### Phase 4: Configuration & Monitoring

7. **Environment configuration**
   - Add IMAP credentials to env.ts
   - Support multiple accounts

8. **Add monitoring/logging**
   - Connection status
   - Email processing metrics
   - Error tracking

## Code Examples

### IMAP Provider

```typescript
// src/providers/email/imap.provider.ts
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { EventEmitter } from 'events';

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

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string | undefined;
  textBody: string | undefined;
  htmlBody: string | undefined;
  date: Date;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
  raw: ParsedMail;
}

export class ImapProvider extends EventEmitter {
  private client: ImapFlow;
  private config: ImapConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  constructor(config: ImapConfig) {
    super();
    this.config = config;
    this.client = this.createClient();
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      logger: false,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');

      this.client.on('close', () => this.handleDisconnect());
      this.client.on('error', (err) => this.emit('error', err));
    } catch (error) {
      this.emit('error', error);
      await this.reconnect();
    }
  }

  private async handleDisconnect(): Promise<void> {
    this.isConnected = false;
    this.emit('disconnected');
    await this.reconnect();
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));

    this.client = this.createClient();
    await this.connect();
  }

  async startListening(mailbox = 'INBOX'): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to IMAP server');
    }

    const lock = await this.client.getMailboxLock(mailbox);

    try {
      // Process existing unread emails on startup (optional)
      // await this.processUnread();

      // Listen for new emails
      this.client.on('exists', async (data: { count: number }) => {
        await this.fetchLatestEmail(data.count);
      });

      // Keep connection alive with IDLE
      await this.client.idle();
    } finally {
      lock.release();
    }
  }

  private async fetchLatestEmail(seq: number): Promise<void> {
    try {
      const message = await this.client.fetchOne(String(seq), {
        source: true,
        flags: true,
        envelope: true,
      });

      if (message?.source) {
        const parsed = await this.parseEmail(message.source);
        this.emit('email', parsed);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async parseEmail(source: Buffer): Promise<ParsedEmail> {
    const parsed = await simpleParser(source);

    const getAddresses = (field: ParsedMail['from']): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) {
        return field.flatMap((f) => f.value.map((v) => v.address || ''));
      }
      return field.value.map((v) => v.address || '');
    };

    return {
      messageId: parsed.messageId || `${Date.now()}-${Math.random()}`,
      from: getAddresses(parsed.from)[0] || '',
      to: getAddresses(parsed.to),
      cc: getAddresses(parsed.cc),
      subject: parsed.subject,
      textBody: parsed.text,
      htmlBody: parsed.html || undefined,
      date: parsed.date || new Date(),
      attachments: (parsed.attachments || []).map((att) => ({
        filename: att.filename || 'unknown',
        contentType: att.contentType,
        size: att.size,
        content: att.content,
      })),
      raw: parsed,
    };
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.logout();
      this.isConnected = false;
    }
  }
}
```

### Email Listener Job

```typescript
// src/jobs/email-listener.job.ts
import { ImapProvider, ParsedEmail } from '../providers/email/imap.provider.js';
import { incomingEmailService } from '../modules/incoming-email/incoming-email.service.js';
import { env } from '../env.js';

let imapProvider: ImapProvider | null = null;

export async function startEmailListener(): Promise<void> {
  if (!env.IMAP_HOST || !env.IMAP_USER || !env.IMAP_PASS) {
    console.log('IMAP credentials not configured, skipping email listener');
    return;
  }

  imapProvider = new ImapProvider({
    host: env.IMAP_HOST,
    port: env.IMAP_PORT || 993,
    secure: true,
    auth: {
      user: env.IMAP_USER,
      pass: env.IMAP_PASS,
    },
  });

  imapProvider.on('connected', () => {
    console.log('Connected to IMAP server');
  });

  imapProvider.on('disconnected', () => {
    console.log('Disconnected from IMAP server');
  });

  imapProvider.on('error', (error) => {
    console.error('IMAP error:', error);
  });

  imapProvider.on('email', async (email: ParsedEmail) => {
    console.log(`New email from ${email.from}: ${email.subject}`);
    await incomingEmailService.processEmail(email);
  });

  await imapProvider.connect();
  await imapProvider.startListening();
}

export async function stopEmailListener(): Promise<void> {
  if (imapProvider) {
    await imapProvider.disconnect();
    imapProvider = null;
  }
}
```

### Incoming Email Service

```typescript
// src/modules/incoming-email/incoming-email.service.ts
import { db } from '../../db.js';
import type { ParsedEmail } from '../../providers/email/imap.provider.js';

class IncomingEmailService {
  async processEmail(email: ParsedEmail): Promise<void> {
    // Check for duplicates
    const existing = await db.incomingEmail.findUnique({
      where: { messageId: email.messageId },
    });

    if (existing) {
      console.log(`Email ${email.messageId} already processed, skipping`);
      return;
    }

    // Save to database
    const saved = await db.incomingEmail.create({
      data: {
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        cc: email.cc,
        subject: email.subject,
        textBody: email.textBody,
        htmlBody: email.htmlBody,
        receivedAt: email.date,
        status: 'PROCESSING',
        attachments: {
          create: email.attachments.map((att) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            // Store attachment content to S3/local storage and save path
          })),
        },
      },
    });

    try {
      // Process email with handlers
      await this.handleEmail(saved.id, email);

      await db.incomingEmail.update({
        where: { id: saved.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
    } catch (error) {
      await db.incomingEmail.update({
        where: { id: saved.id },
        data: { status: 'FAILED', metadata: { error: String(error) } },
      });
      throw error;
    }
  }

  private async handleEmail(id: string, email: ParsedEmail): Promise<void> {
    // Implement your custom email handling logic here
    // Examples:
    // - Parse support tickets
    // - Extract data from automated reports
    // - Trigger workflows based on sender/subject
    // - Forward to appropriate department

    console.log(`Processing email ${id}: ${email.subject}`);
  }
}

export const incomingEmailService = new IncomingEmailService();
```

## Environment Variables

Add to `src/env.ts`:

```typescript
// IMAP Configuration (optional)
IMAP_HOST: z.string().optional(),
IMAP_PORT: z.coerce.number().default(993),
IMAP_USER: z.string().optional(),
IMAP_PASS: z.string().optional(),
```

## Email Provider Settings

### Gmail

| Setting | Value |
|---------|-------|
| Host | `imap.gmail.com` |
| Port | `993` |
| Secure | `true` |
| Auth | App Password (requires 2FA) |

**Gmail Setup:**
1. Enable 2-Factor Authentication
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Use generated password as `IMAP_PASS`

### Outlook/Microsoft 365

| Setting | Value |
|---------|-------|
| Host | `outlook.office365.com` |
| Port | `993` |
| Secure | `true` |
| Auth | Account password or OAuth |

### Yahoo

| Setting | Value |
|---------|-------|
| Host | `imap.mail.yahoo.com` |
| Port | `993` |
| Secure | `true` |
| Auth | App password |

## Integration with App

In `src/index.ts`:

```typescript
import { startEmailListener, stopEmailListener } from './jobs/email-listener.job.js';

// After server starts
await startEmailListener();

// In graceful shutdown
process.on('SIGTERM', async () => {
  await stopEmailListener();
  // ... other cleanup
});
```

## Testing

```typescript
// tests/unit/providers/imap.provider.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ImapProvider } from '../../../src/providers/email/imap.provider.js';

describe('ImapProvider', () => {
  it('should parse email correctly', async () => {
    // Mock ImapFlow and test parsing logic
  });

  it('should emit email event on new message', async () => {
    // Test event emission
  });

  it('should reconnect on disconnect', async () => {
    // Test reconnection logic
  });
});
```

## Security Considerations

1. **Credentials**: Store IMAP credentials securely (env vars, secrets manager)
2. **App Passwords**: Use app-specific passwords, not main account passwords
3. **TLS**: Always use secure connections (port 993)
4. **Rate Limiting**: Respect provider rate limits
5. **Attachments**: Scan attachments for malware before processing

## Monitoring

- Track connection uptime
- Monitor email processing latency
- Alert on repeated failures
- Log processing errors with context

## Future Enhancements

- [ ] Support multiple email accounts
- [ ] OAuth2 authentication for Gmail/Outlook
- [ ] Attachment storage to S3
- [ ] Email reply/threading support
- [ ] Dead letter queue for failed emails
- [ ] Admin dashboard for email monitoring
