// Main email exports
export { renderEmailTemplate } from "./renderer";
export { createBaseTemplate } from "./templates/base";
export { createWaitlistWelcomeEmail } from "./templates/waitlist-welcome";

// Type exports
export type { EmailTemplateData, RenderedEmail } from "./templates/types";
