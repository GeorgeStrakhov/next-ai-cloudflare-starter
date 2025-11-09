interface BaseTemplateOptions {
  title: string;
  content: string; // HTML content to inject
  preheader?: string; // Preview text for email clients
  showFooter?: boolean;
}

export function createBaseTemplate({
  title,
  content,
  preheader = "",
  showFooter = true,
}: BaseTemplateOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote { 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
    }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4f4f4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333333;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #dddddd;
    }
    
    /* Content */
    .content {
      padding: 32px 24px;
      line-height: 1.6;
      color: #333333;
    }
    
    .content h1 {
      color: #333333;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 24px 0;
      line-height: 1.2;
    }
    
    .content h2 {
      color: #333333;
      font-size: 20px;
      font-weight: 600;
      margin: 32px 0 16px 0;
      line-height: 1.3;
    }
    
    .content h3 {
      color: #333333;
      font-size: 18px;
      font-weight: 600;
      margin: 24px 0 12px 0;
    }
    
    .content p {
      margin: 0 0 16px 0;
      color: #333333;
    }
    
    .content ul, .content ol {
      margin: 16px 0;
      padding-left: 20px;
      color: #333333;
    }
    
    .content li {
      margin: 8px 0;
    }
    
    .content blockquote {
      margin: 24px 0;
      padding: 16px 20px;
      background-color: #f8f8f8;
      border-left: 4px solid #007cba;
      color: #333333;
    }
    
    .content a {
      color: #007cba;
      text-decoration: none;
    }
    
    .content a:hover {
      color: #005a87;
      text-decoration: underline;
    }
    
    /* Buttons */
    .button {
      display: inline-block;
      background-color: #007cba;
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 14px 28px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 16px;
      margin: 16px 0;
    }
    
    .button:hover {
      background-color: #005a87;
    }
    
    /* Footer */
    .footer {
      background-color: #f8f8f8;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #dddddd;
    }
    
    .footer p {
      color: #666666;
      font-size: 14px;
      margin: 8px 0;
    }
    
    .footer a {
      color: #007cba;
      text-decoration: none;
    }
    
    .footer a:hover {
      color: #005a87;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; }
      .content { padding: 24px 16px !important; }
      .footer { padding: 20px 16px !important; }
      .content h1 { font-size: 24px !important; }
      .content h2 { font-size: 18px !important; }
      .button { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body>
  ${
    preheader
      ? `
  <!-- Preheader text -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>
  `
      : ""
  }
  
  <div class="email-container">
    <!-- Main Content -->
    <div class="content">
      ${content}
    </div>
    
    ${
      showFooter
        ? `
    <!-- Footer -->
    <div class="footer">
      <p>
        This email was sent to you.
      </p>
    </div>
    `
        : ""
    }
  </div>
</body>
</html>`.trim();
}
