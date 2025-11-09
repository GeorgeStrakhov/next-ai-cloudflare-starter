export interface EmailTemplateData {
  subject: string;
  content: string;
  recipientEmail: string;
}

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}
