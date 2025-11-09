import * as postmark from "postmark";
import { appConfig, env } from "@/lib/config";

// Lazy initialization of Postmark client to avoid build errors
let client: postmark.ServerClient | null = null;

function getPostmarkClient(): postmark.ServerClient | null {
  if (!client) {
    if (!process.env.POSTMARK_API_KEY) {
      // In development, allow missing API key (emails will be logged instead)
      if (env.isDevelopment) {
        console.warn(
          "⚠️  POSTMARK_API_KEY not set - emails will be logged to console instead.\n" +
          "   This is fine for development. In production, you MUST set POSTMARK_API_KEY."
        );
        return null;
      }
      throw new Error("POSTMARK_API_KEY environment variable is required for production");
    }
    client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  }
  return client;
}

export interface EmailAttachment {
  Name: string;
  Content: string; // Base64 encoded content
  ContentType: string;
  ContentID?: string; // For inline attachments
}

export interface EmailAttachmentFromUrl {
  name: string;
  url: string;
  contentType?: string; // Auto-detected if not provided
  isInline?: boolean;
}

export interface SendEmailOptions {
  from: string; // Can be "email@domain.com" or "Display Name <email@domain.com>"
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  attachmentUrls?: EmailAttachmentFromUrl[]; // Fetch attachments from URLs
  tag?: string; // For tracking/categorization
  metadata?: Record<string, string>; // Custom metadata
}

/**
 * Format email address with display name
 * @param email Email address
 * @param name Display name (optional)
 * @returns Formatted email string
 */
export function formatEmailAddress(email: string, name?: string): string {
  if (!name) {
    return email;
  }
  // If name contains special characters, wrap in quotes
  const needsQuotes = /[,;:<>@"\\]/.test(name);
  const formattedName = needsQuotes ? `"${name.replace(/"/g, '\\"')}"` : name;
  return `${formattedName} <${email}>`;
}

/**
 * Fetch attachment from URL and convert to base64
 * @param attachmentUrl URL attachment configuration
 * @returns EmailAttachment object
 */
async function fetchAttachmentFromUrl(
  attachmentUrl: EmailAttachmentFromUrl,
): Promise<EmailAttachment> {
  try {
    const response = await fetch(attachmentUrl.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch attachment: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    // Auto-detect content type if not provided
    const contentType =
      attachmentUrl.contentType ||
      response.headers.get("content-type") ||
      "application/octet-stream";

    const attachment: EmailAttachment = {
      Name: attachmentUrl.name,
      Content: base64Content,
      ContentType: contentType,
    };

    if (attachmentUrl.isInline) {
      attachment.ContentID = `cid:${attachmentUrl.name}`;
    }

    return attachment;
  } catch {
    // Error details logged server-side
    throw new Error(`Failed to fetch attachment: ${attachmentUrl.name}`);
  }
}

/**
 * Send an email using Postmark
 * @param options Email configuration options
 * @returns Promise with Postmark response
 */
export async function sendEmail(options: SendEmailOptions) {
  const {
    from,
    to,
    subject,
    htmlBody,
    textBody,
    cc,
    bcc,
    attachments = [],
    attachmentUrls = [],
    tag,
    metadata,
  } = options;

  // Validate required fields
  if (!from || !to || !subject) {
    throw new Error(
      "Missing required fields: from, to, and subject are required",
    );
  }

  if (!htmlBody && !textBody) {
    throw new Error("Either htmlBody or textBody must be provided");
  }

  // In development, just log the email
  if (env.isDevelopment) {
    console.log("\n===========================================");
    console.log("📧 EMAIL (Development Mode)");
    console.log("===========================================");
    console.log(`From: ${from}`);
    console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
    if (cc) console.log(`CC: ${Array.isArray(cc) ? cc.join(", ") : cc}`);
    if (bcc) console.log(`BCC: ${Array.isArray(bcc) ? bcc.join(", ") : bcc}`);
    console.log(`Subject: ${subject}`);
    if (tag) console.log(`Tag: ${tag}`);
    if (metadata) console.log(`Metadata:`, metadata);
    console.log("-------------------------------------------");

    // Extract and highlight magic links for easy clicking
    if (tag === "magic-link" && (htmlBody || textBody)) {
      const content = htmlBody || textBody || "";
      const urlMatch = content.match(/https?:\/\/[^\s<>"]+/);
      if (urlMatch) {
        console.log("🔗 MAGIC LINK (Click to sign in):");
        console.log(urlMatch[0]);
        console.log("-------------------------------------------");
      }
    }

    if (textBody) {
      console.log("TEXT BODY:");
      console.log(textBody);
    }
    if (htmlBody) {
      console.log("HTML BODY:");
      console.log(
        htmlBody.substring(0, 500) + (htmlBody.length > 500 ? "..." : ""),
      );
    }
    if (attachments.length > 0) {
      console.log(`Attachments: ${attachments.map((a) => a.Name).join(", ")}`);
    }
    if (attachmentUrls.length > 0) {
      console.log(
        `URL Attachments: ${attachmentUrls.map((a) => a.name).join(", ")}`,
      );
    }
    console.log("===========================================\n");

    // Return mock response
    return {
      To: Array.isArray(to) ? to.join(",") : to,
      SubmittedAt: new Date().toISOString(),
      MessageID: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ErrorCode: 0,
      Message: "Development mode - email logged to console",
    };
  }

  try {
    // Process URL attachments
    const urlAttachments: EmailAttachment[] = [];
    if (attachmentUrls.length > 0) {
      const fetchPromises = attachmentUrls.map((url) =>
        fetchAttachmentFromUrl(url),
      );
      const fetchedAttachments = await Promise.all(fetchPromises);
      urlAttachments.push(...fetchedAttachments);
    }

    // Combine all attachments
    const allAttachments = [...attachments, ...urlAttachments];

    const emailData: Record<string, unknown> = {
      From: from,
      To: Array.isArray(to) ? to.join(",") : to,
      Subject: subject,
    };

    // Add body content
    if (htmlBody) {
      emailData.HtmlBody = htmlBody;
    }
    if (textBody) {
      emailData.TextBody = textBody;
    }

    // Add optional fields
    if (cc) {
      emailData.Cc = Array.isArray(cc) ? cc.join(",") : cc;
    }
    if (bcc) {
      emailData.Bcc = Array.isArray(bcc) ? bcc.join(",") : bcc;
    }
    if (allAttachments.length > 0) {
      emailData.Attachments = allAttachments;
    }
    if (tag) {
      emailData.Tag = tag;
    }
    if (metadata) {
      emailData.Metadata = metadata;
    }

    const client = getPostmarkClient();
    if (!client) {
      throw new Error("Postmark client not initialized. Check POSTMARK_API_KEY is set.");
    }

    const response = await client.sendEmail(
      emailData as unknown as postmark.Message,
    );
    return response;
  } catch (error) {
    // Error logged server-side
    throw error;
  }
}

/**
 * Send bulk emails (up to 500 recipients per batch)
 * @param emails Array of email configurations
 * @returns Promise with Postmark batch response
 */
export async function sendBulkEmails(emails: SendEmailOptions[]) {
  if (emails.length === 0) {
    throw new Error("No emails provided");
  }

  if (emails.length > 500) {
    throw new Error("Maximum 500 emails per batch");
  }

  try {
    const emailBatch = emails.map((email) => {
      const emailData: Record<string, unknown> = {
        From: email.from,
        To: Array.isArray(email.to) ? email.to.join(",") : email.to,
        Subject: email.subject,
      };

      if (email.htmlBody) emailData.HtmlBody = email.htmlBody;
      if (email.textBody) emailData.TextBody = email.textBody;
      if (email.cc)
        emailData.Cc = Array.isArray(email.cc) ? email.cc.join(",") : email.cc;
      if (email.bcc)
        emailData.Bcc = Array.isArray(email.bcc)
          ? email.bcc.join(",")
          : email.bcc;
      if (email.attachments) emailData.Attachments = email.attachments;
      if (email.tag) emailData.Tag = email.tag;
      if (email.metadata) emailData.Metadata = email.metadata;

      return emailData;
    });

    const client = getPostmarkClient();
    if (!client) {
      throw new Error("Postmark client not initialized. Check POSTMARK_API_KEY is set.");
    }

    const response = await client.sendEmailBatch(
      emailBatch as unknown as postmark.Message[],
    );
    return response;
  } catch (error) {
    // Error logged server-side
    throw error;
  }
}

/**
 * Send email with template (if using Postmark templates)
 * @param templateAlias Template alias or ID
 * @param templateModel Data to populate template
 * @param options Basic email options (from, to, etc.)
 * @returns Promise with Postmark response
 */
export async function sendTemplateEmail(
  templateAlias: string | number,
  templateModel: Record<string, unknown>,
  options: Omit<SendEmailOptions, "htmlBody" | "textBody">,
) {
  const { from, to, cc, bcc, attachments, tag, metadata } = options;

  try {
    const emailData: Record<string, unknown> = {
      From: from,
      To: Array.isArray(to) ? to.join(",") : to,
      TemplateAlias:
        typeof templateAlias === "string" ? templateAlias : undefined,
      TemplateId: typeof templateAlias === "number" ? templateAlias : undefined,
      TemplateModel: templateModel,
    };

    if (cc) emailData.Cc = Array.isArray(cc) ? cc.join(",") : cc;
    if (bcc) emailData.Bcc = Array.isArray(bcc) ? bcc.join(",") : bcc;
    if (attachments) emailData.Attachments = attachments;
    if (tag) emailData.Tag = tag;
    if (metadata) emailData.Metadata = metadata;

    const client = getPostmarkClient();
    if (!client) {
      throw new Error("Postmark client not initialized. Check POSTMARK_API_KEY is set.");
    }

    const response = await client.sendEmailWithTemplate(
      emailData as unknown as postmark.TemplatedMessage,
    );
    return response;
  } catch (error) {
    // Error logged server-side
    throw error;
  }
}

/**
 * Utility function to create email attachment from file
 * @param fileName Name of the file
 * @param fileContent Base64 encoded file content
 * @param contentType MIME type of the file
 * @param isInline Whether attachment should be inline (for images in HTML)
 * @returns EmailAttachment object
 */
export function createAttachment(
  fileName: string,
  fileContent: string,
  contentType: string,
  isInline = false,
): EmailAttachment {
  const attachment: EmailAttachment = {
    Name: fileName,
    Content: fileContent,
    ContentType: contentType,
  };

  if (isInline) {
    attachment.ContentID = `cid:${fileName}`;
  }

  return attachment;
}

/**
 * Common email templates and utilities
 */
export const EmailTemplates = {
  /**
   * Create a simple notification email
   */
  notification: (
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string,
  ) => ({
    htmlBody: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">${title}</h2>
            <p>${message}</p>
            ${
              actionUrl && actionText
                ? `
              <div style="margin: 30px 0;">
                <a href="${actionUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  ${actionText}
                </a>
              </div>
            `
                : ""
            }
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The ${appConfig.name} Team
            </p>
          </div>
        </body>
      </html>
    `,
    textBody: `
${title}

${message}

${actionUrl && actionText ? `${actionText}: ${actionUrl}` : ""}

Best regards,
The ${appConfig.name} Team
    `.trim(),
  }),
};
