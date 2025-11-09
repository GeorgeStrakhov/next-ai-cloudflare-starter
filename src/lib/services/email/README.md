# Email Service

A comprehensive email service built on top of Postmark, providing easy-to-use functions for sending emails with support for attachments, templates, and bulk sending.

## Setup

### Environment Variables

Add to your `.env` file:

```bash
POSTMARK_API_KEY=your-postmark-server-api-token
EMAIL_FROM=noreply@yourdomain.com  # Must be verified in Postmark
```

### Installation

The service uses the `postmark` package which should already be installed:

```bash
pnpm add postmark
```

## Usage

### Basic Email

```typescript
import { sendEmail, formatEmailAddress } from "@/services/email/email";

await sendEmail({
  from: "MyApp Team <noreply@myapp.com>", // With display name
  to: "user@example.com",
  subject: "Welcome to MyApp!",
  htmlBody: "<h1>Welcome!</h1><p>Thanks for joining us.</p>",
  textBody: "Welcome! Thanks for joining us.",
});

// Or use the helper function
await sendEmail({
  from: formatEmailAddress("noreply@myapp.com", "MyApp Team"),
  to: "user@example.com",
  subject: "Welcome to MyApp!",
  htmlBody: "<h1>Welcome!</h1><p>Thanks for joining us.</p>",
});
```

### Multiple Recipients

```typescript
await sendEmail({
  from: "MyApp Newsletter <newsletter@myapp.com>",
  to: ["user1@example.com", "user2@example.com"],
  cc: "Manager <manager@myapp.com>",
  bcc: ["analytics@myapp.com"],
  subject: "Weekly Newsletter",
  htmlBody: "<h1>This Week at MyApp</h1>...",
});
```

### Email Address Formatting

Display names make emails look more professional in email clients:

```typescript
import { formatEmailAddress } from "@/services/email/email";

// Different ways to include display names
const examples = [
  // Direct formatting
  "MyApp Team <noreply@myapp.com>",

  // Using helper function
  formatEmailAddress("support@myapp.com", "MyApp Support"),

  // With special characters (automatically quoted)
  formatEmailAddress("admin@myapp.com", "MyApp Admin, Inc."),

  // Multiple recipients with names
  [
    "John Doe <john@example.com>",
    formatEmailAddress("jane@example.com", "Jane Smith"),
  ],
];

await sendEmail({
  from: "MyApp Notifications <notifications@myapp.com>",
  to: "User Name <user@example.com>",
  cc: formatEmailAddress("manager@myapp.com", "Team Manager"),
  subject: "Professional Email",
  htmlBody: "<p>This email looks professional!</p>",
});
```

**What users see:**

- ❌ `noreply@myapp.com` (just email)
- ✅ `MyApp Team <noreply@myapp.com>` (professional display name)

### Attachments from Base64

```typescript
import { sendEmail, createAttachment } from "@/services/email/email";

// Create attachment from base64 content
const pdfAttachment = createAttachment(
  "report.pdf",
  base64PdfContent,
  "application/pdf",
);

await sendEmail({
  from: "reports@myapp.com",
  to: "user@example.com",
  subject: "Your Monthly Report",
  htmlBody: "<p>Please find your report attached.</p>",
  attachments: [pdfAttachment],
});
```

### Attachments from URLs

```typescript
await sendEmail({
  from: "reports@myapp.com",
  to: "user@example.com",
  subject: "Your Generated Report",
  htmlBody: "<p>Your report is ready!</p>",
  attachmentUrls: [
    {
      name: "monthly-report.pdf",
      url: "https://cdn.myapp.com/reports/user123/monthly.pdf",
      contentType: "application/pdf",
    },
    {
      name: "logo.png",
      url: "https://cdn.myapp.com/images/logo.png",
      isInline: true, // For embedding in HTML
    },
  ],
});
```

### Inline Images

```typescript
await sendEmail({
  from: "marketing@myapp.com",
  to: "user@example.com",
  subject: "Check out our new feature!",
  htmlBody: `
    <h1>New Feature Announcement</h1>
    <p>Check out our amazing new dashboard:</p>
    <img src="cid:dashboard-screenshot.png" alt="Dashboard" />
  `,
  attachmentUrls: [
    {
      name: "dashboard-screenshot.png",
      url: "https://cdn.myapp.com/screenshots/dashboard.png",
      isInline: true,
    },
  ],
});
```

### Bulk Emails

```typescript
import { sendBulkEmails } from "@/services/email/email";

const emails = [
  {
    from: "noreply@myapp.com",
    to: "user1@example.com",
    subject: "Personal Message for User 1",
    htmlBody: "<p>Hello User 1!</p>",
  },
  {
    from: "noreply@myapp.com",
    to: "user2@example.com",
    subject: "Personal Message for User 2",
    htmlBody: "<p>Hello User 2!</p>",
  },
];

// Send up to 500 emails in one batch
await sendBulkEmails(emails);
```

### Using Templates

```typescript
import { sendTemplateEmail } from "@/services/email/email";

await sendTemplateEmail(
  "welcome-template", // Template alias in Postmark
  {
    user_name: "John Doe",
    activation_url: "https://myapp.com/activate/abc123",
    company_name: "MyApp",
  },
  {
    from: "welcome@myapp.com",
    to: "john@example.com",
  },
);
```

### Pre-built Templates

```typescript
import { sendEmail, EmailTemplates } from "@/services/email/email";

await sendEmail({
  from: "notifications@myapp.com",
  to: "user@example.com",
  subject: "Account Activated",
  ...EmailTemplates.notification(
    "Account Activated",
    "Your MyApp account has been successfully activated!",
    "https://myapp.com/dashboard",
    "Go to Dashboard",
  ),
  tag: "account-activation",
});
```

### With Tracking and Metadata

```typescript
await sendEmail({
  from: "campaigns@myapp.com",
  to: "user@example.com",
  subject: "Special Offer",
  htmlBody: "<p>Limited time offer just for you!</p>",
  tag: "summer-campaign", // For analytics in Postmark
  metadata: {
    campaign_id: "summer2024",
    user_segment: "premium",
    send_date: "2024-07-03",
  },
});
```

## API Reference

### Types

```typescript
interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  attachmentUrls?: EmailAttachmentFromUrl[];
  tag?: string;
  metadata?: Record<string, string>;
}

interface EmailAttachment {
  Name: string;
  Content: string; // Base64 encoded
  ContentType: string;
  ContentID?: string; // For inline attachments
}

interface EmailAttachmentFromUrl {
  name: string;
  url: string;
  contentType?: string; // Auto-detected if not provided
  isInline?: boolean;
}
```

### Functions

- **`sendEmail(options)`** - Send a single email
- **`sendBulkEmails(emails[])`** - Send up to 500 emails in batch
- **`sendTemplateEmail(templateId, model, options)`** - Send using Postmark template
- **`createAttachment(name, content, type, isInline?)`** - Create attachment object
- **`formatEmailAddress(email, name?)`** - Format email with display name

### Utilities

- **`EmailTemplates.notification(title, message, actionUrl?, actionText?)`** - Pre-built notification template

## Error Handling

The service throws descriptive errors for common issues:

```typescript
try {
  await sendEmail({
    from: "test@myapp.com",
    to: "user@example.com",
    subject: "Test",
    // Missing body - will throw error
  });
} catch (error) {
  console.error("Email failed:", error.message);
  // Handle specific errors like attachment fetch failures
}
```

## Best Practices

1. **Always provide both HTML and text versions** for better deliverability
2. **Use descriptive attachment names** - helps with spam filters
3. **Keep attachments under 10MB total** - Postmark limit
4. **Use tags and metadata** for tracking and analytics
5. **Validate email addresses** before sending
6. **Handle URL attachment failures gracefully** - network issues can occur

## Postmark Features Supported

- ✅ Single and bulk email sending
- ✅ HTML and text content
- ✅ File attachments (base64 and URLs)
- ✅ Inline images
- ✅ CC and BCC
- ✅ Email tagging
- ✅ Custom metadata
- ✅ Template emails
- ✅ Automatic content-type detection

## Environment Configuration

The service separates email functionality from authentication:

- **`POSTMARK_API_KEY`** - General email sending (this service)
- **`AUTH_POSTMARK_KEY`** - Magic link authentication (auth system)
- **`EMAIL_FROM`** - Default sender address (must be verified in Postmark)
