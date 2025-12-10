import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/email/email";
import { appConfig } from "@/lib/config";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactFormData;
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Send email to admin
    const adminEmail = appConfig.email;
    const fromEmail = process.env.EMAIL_FROM || appConfig.email;

    await sendEmail({
      from: fromEmail,
      to: adminEmail,
      subject: `[Contact] ${subject}`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Contact Form Submission</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-bottom: 10px;">Message:</h3>
              <div style="background-color: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This message was sent from the contact form on ${appConfig.name}.
              <br>Reply directly to this email to respond to ${name}.
            </p>
          </body>
        </html>
      `,
      textBody: `
New Contact Form Submission
===========================

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the contact form on ${appConfig.name}.
Reply directly to this email to respond to ${name}.
      `.trim(),
      tag: "contact-form",
      metadata: {
        senderName: name,
        senderEmail: email,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. We'll get back to you soon!",
    });
  } catch (error) {
    console.error("Error sending contact form:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
