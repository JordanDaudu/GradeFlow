/**
 * Deterministic per-course color accent.
 *
 * Hashes the course code (or any string key) to a hue (0-359) and returns
 * a set of HSL color tokens. Saturation and lightness are fixed constants so
 * every generated color has the same visual weight — only the hue changes.
 *
 * The colors are deliberately subtle:
 *  - stripe   : solid medium-brightness border accent
 *  - headerBg : near-transparent tint for card headers
 *  - badgeBg  : slightly more opaque fill for pill badges
 *  - badgeBorder : translucent border ring for badges
 *  - badgeText : readable text, adjusted for light vs dark mode
 */

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export interface CourseColorTokens {
  stripe: string;
  headerBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export function courseColor(key: string, dark = false): CourseColorTokens {
  const hue = hashCode(key) % 360;

  if (dark) {
    return {
      stripe:       `hsl(${hue}, 55%, 52%)`,
      headerBg:     `hsla(${hue}, 50%, 55%, 0.07)`,
      badgeBg:      `hsla(${hue}, 50%, 55%, 0.14)`,
      badgeBorder:  `hsla(${hue}, 55%, 60%, 0.28)`,
      badgeText:    `hsl(${hue}, 60%, 74%)`,
    };
  }

  return {
    stripe:       `hsl(${hue}, 55%, 50%)`,
    headerBg:     `hsla(${hue}, 60%, 58%, 0.07)`,
    badgeBg:      `hsla(${hue}, 60%, 58%, 0.10)`,
    badgeBorder:  `hsla(${hue}, 60%, 55%, 0.22)`,
    badgeText:    `hsl(${hue}, 60%, 34%)`,
  };
}
