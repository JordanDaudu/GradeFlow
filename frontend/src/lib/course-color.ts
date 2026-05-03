export type CourseColorTokens = {
  stripe: string;
  headerBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
};

const COURSE_HUES = [
  210, // blue
  155, // green
  275, // purple
  25,  // orange
  340, // pink/red
  185, // cyan
  45,  // gold
  120, // green
  300, // magenta
  0,   // red
];

function hashCode(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function courseColor(key: string, dark = false): CourseColorTokens {
  const safeKey = key.trim() || "default";
  const hue = COURSE_HUES[hashCode(safeKey) % COURSE_HUES.length];

  if (dark) {
    return {
      stripe: `hsl(${hue}, 55%, 52%)`,
      headerBg: `hsla(${hue}, 50%, 55%, 0.07)`,
      badgeBg: `hsla(${hue}, 50%, 55%, 0.14)`,
      badgeBorder: `hsla(${hue}, 55%, 60%, 0.28)`,
      badgeText: `hsl(${hue}, 60%, 74%)`,
    };
  }

  return {
    stripe: `hsl(${hue}, 55%, 50%)`,
    headerBg: `hsla(${hue}, 60%, 58%, 0.07)`,
    badgeBg: `hsla(${hue}, 60%, 58%, 0.10)`,
    badgeBorder: `hsla(${hue}, 60%, 55%, 0.22)`,
    badgeText: `hsl(${hue}, 60%, 34%)`,
  };
}