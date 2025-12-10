/**
 * Font Configuration
 *
 * This file centralizes all font setup for the application.
 * To customize fonts, follow these steps:
 *
 * 1. Choose your Google Fonts from https://fonts.google.com
 * 2. Import them from "next/font/google" below
 * 3. Configure each font with a CSS variable name
 * 4. Update the fontVariables export
 * 5. Update globals.css to map --font-heading, --font-body, --font-mono
 *
 * Example: Switching to Inter + Playfair Display + Fira Code
 *
 * ```typescript
 * import { Inter, Playfair_Display, Fira_Code } from "next/font/google";
 *
 * const inter = Inter({
 *   variable: "--font-inter",
 *   subsets: ["latin"],
 * });
 *
 * const playfair = Playfair_Display({
 *   variable: "--font-playfair",
 *   subsets: ["latin"],
 * });
 *
 * const firaCode = Fira_Code({
 *   variable: "--font-fira-code",
 *   subsets: ["latin"],
 * });
 *
 * export const fontVariables = `${inter.variable} ${playfair.variable} ${firaCode.variable}`;
 * ```
 *
 * Then update globals.css:
 * ```css
 * @theme inline {
 *   --font-sans: var(--font-inter);
 *   --font-heading: var(--font-playfair);
 *   --font-body: var(--font-inter);
 *   --font-mono: var(--font-fira-code);
 * }
 * ```
 */

import { Geist, Geist_Mono } from "next/font/google";

// =============================================================================
// FONT DEFINITIONS
// =============================================================================
// Import and configure your Google Fonts here.
// Each font needs a unique CSS variable name (e.g., "--font-geist-sans").
// Browse fonts at: https://fonts.google.com

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// =============================================================================
// EXPORTS
// =============================================================================
// fontVariables: String of CSS variable classes to add to <body>
// This makes the fonts available throughout the app via CSS variables.

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;

/**
 * Font CSS variable names for reference:
 * - --font-geist-sans: Geist Sans (default body/heading font)
 * - --font-geist-mono: Geist Mono (default monospace font)
 *
 * These are mapped in globals.css to semantic font variables:
 * - --font-heading: Used for headings (h1, h2, etc.)
 * - --font-body: Used for body text
 * - --font-mono: Used for code blocks
 * - --font-sans: Tailwind's default sans-serif stack
 */
