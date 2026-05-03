export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_UPLOAD_ACCEPT = [".pdf", "application/pdf"].join(",");

const DANGEROUS_FILE_EXTENSIONS = [
  "exe",
  "bat",
  "sh",
  "cmd",
  "msi",
  "ps1",
  "scr",
] as const;

const DANGEROUS_EXT_PATTERN = new RegExp(
  `\\.(?:${DANGEROUS_FILE_EXTENSIONS.join("|")})$`,
  "i",
);

// `docx` (Office Open XML) renders inline because the API converts it to HTML
// on the fly. `doc` (legacy binary Word) cannot be rendered inline and falls
// back to the download badge.
export type PreviewKind = "pdf" | "docx" | "doc" | "other";

export function getPreviewKind(
  contentType: string | null | undefined,
  name: string | null | undefined,
): PreviewKind {
  const ct = (contentType ?? "").toLowerCase();
  const lowerName = (name ?? "").toLowerCase();
  if (ct === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (
    ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return "docx";
  }
  if (ct === "application/msword" || lowerName.endsWith(".doc")) {
    return "doc";
  }
  return "other";
}

export function isInlinePreviewable(kind: PreviewKind): boolean {
  return kind === "pdf";
}

export function isDangerousFileName(name: string): boolean {
  return DANGEROUS_EXT_PATTERN.test(name);
}

export function buildAssignmentFileUrl(
  fileId: number,
  kind: "preview" | "download" = "preview",
): string {
  const base = import.meta.env.BASE_URL;
  return `${base}api/assignment-files/${fileId}/${kind}`;
}

export const ASSIGNMENT_FILE_TOAST = {
  tooLarge: "גודל הקובץ חורג מהמגבלה המותרת (עד 50MB).",
  wrongType: "ניתן להעלות קבצי PDF בלבד.",
  uploadSuccess: "הקובץ הועלה",
  uploadFailed: "העלאת הקובץ נכשלה",
  deleteSuccess: "הקובץ נמחק",
  deleteFailed: "מחיקה נכשלה",
} as const;

// Only PDF renders inline. Everything else shows a download fallback.
type FallbackPreviewKind = Exclude<PreviewKind, "pdf">;

export const PREVIEW_FALLBACK_MESSAGE: Record<FallbackPreviewKind, string> = {
  docx: "קבצי Word אינם נתמכים בתצוגה מקדימה. ניתן להוריד את הקובץ ולפתוח אותו במחשב.",
  doc: "קבצי Word ישנים (.doc) אינם נתמכים בתצוגה מקדימה. ניתן להוריד את הקובץ ולפתוח אותו במחשב.",
  other: "סוג קובץ זה אינו נתמך בתצוגה מקדימה. ניתן להוריד את הקובץ ולפתוח אותו במחשב.",
};

export const PREVIEW_BADGE_LABEL: Record<FallbackPreviewKind, string> = {
  docx: "להורדה בלבד · Word (.docx)",
  doc: "להורדה בלבד · Word ישן (.doc)",
  other: "להורדה בלבד",
};

export type UploadValidation =
  | { ok: true }
  | { ok: false; reason: "too_large" | "wrong_type"; message: string };

export function validateUploadFile(file: File): UploadValidation {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return {
      ok: false,
      reason: "wrong_type",
      message: ASSIGNMENT_FILE_TOAST.wrongType,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "too_large",
      message: ASSIGNMENT_FILE_TOAST.tooLarge,
    };
  }
  return { ok: true };
}
