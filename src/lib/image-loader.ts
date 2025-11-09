/**
 * Custom Next.js Image Loader
 *
 * This loader bypasses Next.js image optimization and returns the source URL as-is.
 * This is necessary because our images are already optimized by Cloudflare's
 * image transformation service via /cdn-cgi/image/ URLs.
 *
 * @see https://nextjs.org/docs/app/api-reference/components/image#loader
 */
export default function cloudflareImageLoader({ src }: { src: string }) {
  return src;
}
