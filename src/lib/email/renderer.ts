import { marked } from "marked";
import { createBaseTemplate } from "./templates/base";
import type { RenderedEmail, EmailTemplateData } from "./templates/types";

// Configure marked for email-safe HTML
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Convert markdown content to email-safe HTML
 */
function markdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

/**
 * Convert HTML content to plain text for email clients that don't support HTML
 */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, "\n\n") // Clean up extra whitespace
    .trim();
}

/**
 * Render an email template with markdown content
 */
export function renderEmailTemplate(
  data: EmailTemplateData,
  options: {
    title?: string;
    preheader?: string;
    showFooter?: boolean;
  } = {},
): RenderedEmail {
  const {
    title = data.subject,
    preheader = data.subject,
    showFooter = true,
  } = options;

  // Convert markdown to HTML
  const htmlContent = markdownToHtml(data.content);

  // Create full HTML email using base template
  const htmlBody = createBaseTemplate({
    title,
    content: htmlContent,
    preheader,
    showFooter,
  });

  // Create plain text version
  const textBody = htmlToText(htmlContent);

  return {
    subject: data.subject,
    htmlBody,
    textBody,
  };
}
