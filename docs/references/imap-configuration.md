# IMAP Email Listener Configuration

This document covers configuring the IMAP email listener for receiving and processing incoming emails.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `IMAP_HOST` | Yes | - | IMAP server hostname |
| `IMAP_PORT` | No | `993` | IMAP server port (993 for SSL) |
| `IMAP_USER` | Yes | - | Email account username |
| `IMAP_PASS` | Yes | - | Email account password or app password |
| `IMAP_MAILBOX` | No | `INBOX` | Mailbox folder to monitor |

If `IMAP_HOST`, `IMAP_USER`, or `IMAP_PASS` are not set, the email listener will skip initialization gracefully.

## Provider Configuration

### Gmail
****
| Setting | Value |
|---------|-------|
| Host | `imap.gmail.com` |
| Port | `993` |
| Auth | App Password (required) |

**Setup Steps:**

1. Enable 2-Factor Authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" as the app and your device
4. Generate and copy the 16-character app password
5. Use the app password as `IMAP_PASS` (not your regular password)

```bash
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your.email@gmail.com
IMAP_PASS=xxxx-xxxx-xxxx-xxxx
IMAP_MAILBOX=INBOX
```

### Outlook / Microsoft 365

| Setting | Value |
|---------|-------|
| Host | `outlook.office365.com` |
| Port | `993` |
| Auth | Basic auth (limited support) |

**Limitations:**

- Microsoft has deprecated basic authentication for many accounts
- Personal accounts (outlook.com, hotmail.com) may work with regular passwords
- Work/school accounts (Microsoft 365) typically require OAuth2
- OAuth2 authentication is **not yet supported** in this implementation

```bash
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_USER=your.email@outlook.com
IMAP_PASS=your-password
IMAP_MAILBOX=INBOX
```

### Yahoo Mail

| Setting | Value |
|---------|-------|
| Host | `imap.mail.yahoo.com` |
| Port | `993` |
| Auth | App Password |

**Setup Steps:**

1. Enable 2-Step Verification in Yahoo Account Security
2. Generate an app password at [Yahoo Account Security](https://login.yahoo.com/account/security)
3. Use the app password as `IMAP_PASS`

```bash
IMAP_HOST=imap.mail.yahoo.com
IMAP_PORT=993
IMAP_USER=your.email@yahoo.com
IMAP_PASS=your-app-password
IMAP_MAILBOX=INBOX
```

### Custom IMAP Server

For self-hosted or custom mail servers:

```bash
IMAP_HOST=mail.yourdomain.com
IMAP_PORT=993
IMAP_USER=user@yourdomain.com
IMAP_PASS=your-password
IMAP_MAILBOX=INBOX
```

## Authentication Methods

### Basic Auth (Currently Supported)

Uses username and password directly. Works with:
- Gmail (with app passwords)
- Yahoo (with app passwords)
- Most self-hosted mail servers
- Some personal Outlook accounts

### OAuth2 (Not Yet Implemented)

Required for:
- Microsoft 365 work/school accounts
- Google Workspace with OAuth-only policies
- Enterprise environments with modern auth requirements

OAuth2 support is planned for a future release. See the [implementation plan](../plans/imapflow-email-processing.md#future-enhancements).

## Troubleshooting

### "Authentication failed" Error

- **Gmail**: Ensure you're using an app password, not your regular password
- **Outlook**: Your account may require OAuth2 (not yet supported)
- **Yahoo**: Ensure you're using an app password with 2-Step Verification enabled

### "Connection refused" Error

- Verify the host and port are correct
- Check if your firewall allows outbound connections on port 993
- Ensure the mail server supports IMAP over SSL

### Listener Not Starting

Check the console for:
```
IMAP: Credentials not configured, skipping email listener
```

This means one or more of `IMAP_HOST`, `IMAP_USER`, or `IMAP_PASS` is missing.

## Security Best Practices

1. **Use app passwords** instead of your main account password
2. **Never commit credentials** to version control
3. **Use environment variables** or a secrets manager in production
4. **Enable 2FA** on all email accounts used for IMAP access
5. **Rotate app passwords** periodically
