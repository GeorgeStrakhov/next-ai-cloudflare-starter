/**
 * Image utility functions for dimension detection and aspect ratio mapping
 */

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Get image dimensions from buffer by parsing image headers
 * Supports PNG, JPEG, GIF, WebP
 */
export function getImageDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    // PNG: dimensions at bytes 16-23
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // GIF: dimensions at bytes 6-9 (little endian)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    // JPEG: need to find SOF marker
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF markers (0xC0-0xCF except 0xC4, 0xC8, 0xCC)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Skip to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    // WebP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      // VP8 format
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      // VP8L format
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4c) {
        const bits = buffer.readUInt32LE(21);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        return { width, height };
      }
      // VP8X format
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
        const width = (buffer.readUInt32LE(24) & 0xffffff) + 1;
        const height = (buffer.readUInt32LE(27) & 0xffffff) + 1;
        return { width, height };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Map actual aspect ratio to closest predefined ratio
 */
export function getClosestAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;

  // Predefined ratios and their numeric values
  const ratios: { name: AspectRatio; value: number }[] = [
    { name: "1:1", value: 1 },
    { name: "16:9", value: 16 / 9 },   // ~1.78
    { name: "9:16", value: 9 / 16 },   // ~0.56
    { name: "4:3", value: 4 / 3 },     // ~1.33
    { name: "3:4", value: 3 / 4 },     // 0.75
  ];

  // Find closest match by absolute difference
  let closest = ratios[0];
  let minDiff = Math.abs(ratio - closest.value);

  for (const r of ratios) {
    const diff = Math.abs(ratio - r.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = r;
    }
  }

  return closest.name;
}
