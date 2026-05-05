import { useState, useEffect, useRef, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
import { useLocation, useParams } from "wouter";
import { 
  useGetSubmission,
  useGetAssignment,
  useGetRubric as useGetAssignmentRubric,
  useGetSubmissionRubricScores,
  useSetSubmissionRubricScores,
  useUpdateSubmission,
  useListFeedbackTemplates,
  useListSubmissions as useGetAssignmentSubmissions,
  useSetSubmissionFile,
  useRequestUploadUrl,
  useListAssignmentFiles,
  type AssignmentFile,
} from "@workspace/api-client-react";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Save,
  MessageSquare,
  Maximize2,
  Minimize2,
  Upload,
  UploadCloud,
  Trash2,
  AlertCircle,
  Flag,
  Lock,
  Paperclip,
  Download,
  User as UserIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ASSIGNMENT_FILE_TOAST,
  buildAssignmentFileUrl,
  getPreviewKind,
  isInlinePreviewable,
  PREVIEW_BADGE_LABEL,
  PREVIEW_FALLBACK_MESSAGE,
  validateUploadFile,
  type PreviewKind,
} from "@/lib/assignment-files";

const FILE_TYPE_LABELS: Record<string, string> = {
  instructions: "הנחיות",
  grading_guide: "מחוון בדיקה",
  reference: "פתרון לדוגמה",
  extra: "חומר נוסף",
};

const FILE_TYPE_ORDER: Record<string, number> = {
  instructions: 0,
  grading_guide: 1,
  reference: 2,
  extra: 3,
};

const buildSubmissionFileUrl = (rawObjectPath: string) => {
  const base = import.meta.env.BASE_URL;
  const trimmed = rawObjectPath.replace(/^\/+/, "");
  const withPrefix = trimmed.startsWith("objects/")
    ? trimmed
    : `objects/${trimmed.replace(/^objects\//, "")}`;
  return `${base}api/storage/${withPrefix}`;
};

const isAssignmentFileIframePreviewable = (
  contentType?: string | null,
  name?: string | null,
) => isInlinePreviewable(getPreviewKind(contentType, name));

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function UnsupportedFilePreview({
  file,
  downloadUrl,
  kind,
  testId,
}: {
  file: AssignmentFile;
  downloadUrl: string;
  kind: Exclude<PreviewKind, "pdf">;
  testId: string;
}) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5"
      data-testid={testId}
      data-preview-kind={kind}
    >
      <div className="h-20 w-20 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mb-5">
        <FileText className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <h3
        className="text-lg font-semibold text-foreground break-all max-w-md"
        data-testid={`${testId}-name`}
      >
        {file.name}
      </h3>
      <p className="text-xs text-muted-foreground mt-1.5" dir="ltr">
        {file.contentType} · {formatFileSize(file.size)}
      </p>
      <p
        className="text-sm text-muted-foreground mt-4 max-w-sm leading-relaxed"
        data-testid={`${testId}-message`}
      >
        {PREVIEW_FALLBACK_MESSAGE[kind]}
      </p>
      <Button asChild className="mt-6 gap-2" data-testid={`${testId}-download`}>
        <a href={downloadUrl}>
          <Download className="h-4 w-4" />
          הורד את הקובץ
        </a>
      </Button>
    </div>
  );
}

// ─── PDF.js canvas viewer ────────────────────────────────────────────────────
// Renders PDF pages directly on <canvas> elements — no iframe, no plugin.
// Chrome cannot block this because there is nothing to block: it's pure canvas.

function PdfPage({
  pdf,
  pageNum,
  containerWidth,
}: {
  pdf: PDFDocumentProxy;
  pageNum: number;
  containerWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || containerWidth <= 0) return;
    let cancelled = false;
    let page: PDFPageProxy | null = null;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;

    pdf.getPage(pageNum).then((p) => {
      if (cancelled) return;
      page = p;
      const dpr = window.devicePixelRatio || 1;
      const baseScale = Math.min((containerWidth - 32) / p.getViewport({ scale: 1 }).width, 2.5);
      // Viewport stays at logical scale — DPR is handled by ctx.scale() below,
      // not by inflating the viewport. Mixing DPR into the viewport scale breaks
      // PDF.js's internal glyph transform matrices.
      const viewport = p.getViewport({ scale: baseScale });
      const canvas = canvasRef.current!;
      canvas.width = Math.round(viewport.width * dpr);
      canvas.height = Math.round(viewport.height * dpr);
      canvas.style.width = `${Math.round(viewport.width)}px`;
      canvas.style.height = `${Math.round(viewport.height)}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;
      ctx.scale(dpr, dpr);
      renderTask = p.render({ canvas, canvasContext: ctx, viewport });
      renderTask.promise.catch(() => {});
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNum, containerWidth]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto shadow-md rounded bg-white block"
    />
  );
}

function PdfCanvasViewer({ data, testId }: { data: ArrayBuffer; testId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? "/";
    const task = pdfjsLib.getDocument({
      data: data.slice(0),
      cMapUrl: `${base}pdfjs-cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${base}pdfjs-standard-fonts/`,
    });
    task.promise
      .then((doc) => {
        setPdf(doc);
        setNumPages(doc.numPages);
      })
      .catch(() => setLoadError(true));
    return () => { task.destroy(); };
  }, [data]);

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">לא ניתן להציג את קובץ ה-PDF.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-muted/20 p-4 space-y-4"
      data-testid={testId}
    >
      {!pdf && (
        <div className="flex items-center justify-center h-full">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      {pdf &&
        Array.from({ length: numPages }, (_, i) => (
          <PdfPage
            key={i}
            pdf={pdf}
            pageNum={i + 1}
            containerWidth={containerWidth}
          />
        ))}
    </div>
  );
}

/**
 * Fetches a file via credentialed fetch, detects its content-type, then:
 *  - application/pdf  → renders with PDF.js canvas (no iframe/plugin)
 *  - text/html        → blob iframe (DOCX converted server-side to HTML)
 */
function FilePreview({
  src,
  className,
  title,
  testId,
}: {
  src: string;
  className?: string;
  title?: string;
  testId?: string;
}) {
  type State =
    | { kind: "loading" }
    | { kind: "pdf"; blobUrl: string }
    | { kind: "html"; blobUrl: string }
    | { kind: "error" };

  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ kind: "loading" });

    fetch(src, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ct = (r.headers.get("content-type") ?? "").toLowerCase();
        const isPdf = ct.includes("application/pdf");
        const blob = isPdf
          ? new Blob([await r.arrayBuffer()], { type: "application/pdf" })
          : await r.blob();
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setState({ kind: isPdf ? "pdf" : "html", blobUrl: objectUrl });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (state.kind === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">לא ניתן לטעון את הקובץ לתצוגה מקדימה.</p>
      </div>
    );
  }

  if (state.kind === "pdf") {
    // <embed> is the correct element for PDF embedding — Chrome allows blob:
    // URLs here (unlike <iframe> which it blocks for PDFs since v105).
    return (
      <embed
        src={state.blobUrl}
        type="application/pdf"
        className={className}
        data-testid={testId}
      />
    );
  }

  // HTML (DOCX → HTML rendered server-side) — iframe is fine for non-PDF blobs
  return (
    <iframe
      src={state.blobUrl}
      className={className}
      title={title}
      data-testid={testId}
    />
  );
}

const STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: "pending", label: "לא נבדק" },
  { value: "in_progress", label: "בתהליך" },
  { value: "needs_review", label: "דורש בדיקה חוזרת" },
  { value: "graded", label: "נבדק" },
  { value: "returned", label: "הוחזר" },
  { value: "missing", label: "חסר הגשה" },
];

type SubmissionStatus =
  | "pending"
  | "in_progress"
  | "needs_review"
  | "graded"
  | "returned"
  | "missing";

function SaveIndicator({
  isSaving,
  lastSavedAt,
}: {
  isSaving: boolean;
  lastSavedAt: number | null;
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!lastSavedAt) {
      setPulse(false);
      return;
    }
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 2500);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  if (isSaving) {
    return (
      <span
        className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        data-testid="save-indicator"
        data-state="saving"
      >
        <Clock className="h-3 w-3 animate-spin" />
        שומר...
      </span>
    );
  }

  if (pulse) {
    return (
      <span
        className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
        data-testid="save-indicator"
        data-state="saved"
      >
        <CheckCircle2 className="h-3 w-3" />
        נשמר
      </span>
    );
  }

  return null;
}

export default function GradingPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const assignmentId = parseInt(params.id || "0", 10);
  const submissionId = parseInt(params.submissionId || "0", 10);
  
  const queryClient = useQueryClient();
  
  // Data fetching
  const { data: assignment } = useGetAssignment(assignmentId);
  const { data: submission, isLoading: isSubmissionLoading } = useGetSubmission(submissionId);
  const { data: rubric } = useGetAssignmentRubric(assignmentId);
  const { data: rubricScores, isLoading: isScoresLoading } = useGetSubmissionRubricScores(submissionId);
  const { data: templates } = useListFeedbackTemplates();
  const { data: allSubmissions } = useGetAssignmentSubmissions(assignmentId);
  const { data: assignmentFiles } = useListAssignmentFiles(assignmentId);
  
  // Mutations
  const saveScores = useSetSubmissionRubricScores();
  const updateSubmission = useUpdateSubmission();
  const requestUpload = useRequestUploadUrl();
  const attachFile = useSetSubmissionFile();

  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePreview, setActivePreview] = useState<string>("submission");
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [mobileSelectedFile, setMobileSelectedFile] = useState<AssignmentFile | null>(null);
  const [manualScore, setManualScore] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [privateNotes, setPrivateNotes] = useState<string>("");
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("pending");
  const [originalityFlag, setOriginalityFlag] = useState<boolean>(false);
  const [submittedLate, setSubmittedLate] = useState<boolean>(false);
  const [scores, setScores] = useState<Record<number, { points: number, comment: string }>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [overrideScore, setOverrideScore] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
    }
  }, []);

  // Reset the "saved" pulse whenever we navigate to a different submission.
  useEffect(() => {
    setLastSavedAt(null);
  }, [submissionId]);

  // Track the last-saved snapshot to detect unsaved changes
  const savedSnapshot = useRef<string>("");
  const currentSnapshot = JSON.stringify({ feedback, privateNotes, submissionStatus, originalityFlag, submittedLate, scores });
  const isDirty = savedSnapshot.current !== "" && savedSnapshot.current !== currentSnapshot;


  // Warn on browser reload / tab close when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Ref to keep handleSave fresh inside the keyboard listener
  const handleSaveRef = useRef<(andNext?: boolean) => Promise<void>>(async () => {});

  // Initialize state when data loads
  useEffect(() => {
    if (submission) {
      setFeedback(submission.feedback || "");
      setManualScore(submission.score !== null && submission.score !== undefined ? submission.score.toString() : "");
      setPrivateNotes((submission as { privateNotes?: string | null }).privateNotes ?? "");
      setSubmissionStatus(((submission.status as SubmissionStatus) ?? "pending"));
      setOriginalityFlag(Boolean((submission as { originalityFlag?: boolean }).originalityFlag));
      setSubmittedLate(Boolean((submission as { submittedLate?: boolean }).submittedLate));
    }
  }, [submission]);

  // Update snapshot after data has loaded so isDirty starts false
  useEffect(() => {
    if (submission) {
      savedSnapshot.current = JSON.stringify({
        feedback: submission.feedback || "",
        privateNotes: (submission as { privateNotes?: string | null }).privateNotes ?? "",
        submissionStatus: (submission.status as SubmissionStatus) ?? "pending",
        originalityFlag: Boolean((submission as { originalityFlag?: boolean }).originalityFlag),
        submittedLate: Boolean((submission as { submittedLate?: boolean }).submittedLate),
        scores,
      });
    }
  }, [submission?.id]);

  useEffect(() => {
    if (rubricScores && rubricScores.length > 0) {
      const scoreMap: Record<number, { points: number, comment: string }> = {};
      rubricScores.forEach(rs => {
        scoreMap[rs.criterionId] = { 
          points: rs.points, 
          comment: rs.comment || "" 
        };
      });
      setScores(scoreMap);
    } else if (rubric && rubric.length > 0 && Object.keys(scores).length === 0) {
      // Init empty scores
      const scoreMap: Record<number, { points: number, comment: string }> = {};
      rubric.forEach(c => {
        scoreMap[c.id] = { points: 0, comment: "" };
      });
      setScores(scoreMap);
    }
  }, [rubricScores, rubric]);

  // Derived state
  const hasRubric = rubric && rubric.length > 0;
  const isGraded = submissionStatus === "graded";
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === submissionStatus)?.label ?? "";

  const sortedAssignmentFiles = useMemo(() => {
    if (!assignmentFiles) return [] as AssignmentFile[];
    return [...assignmentFiles].sort((a, b) => {
      const oa = FILE_TYPE_ORDER[a.fileType] ?? 99;
      const ob = FILE_TYPE_ORDER[b.fileType] ?? 99;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, "he");
    });
  }, [assignmentFiles]);

  const activeAssignmentFile = useMemo(() => {
    if (!activePreview.startsWith("file-")) return null;
    const fid = parseInt(activePreview.slice(5), 10);
    return sortedAssignmentFiles.find((f) => f.id === fid) ?? null;
  }, [activePreview, sortedAssignmentFiles]);

  // If the active file disappears (e.g. deleted elsewhere), fall back to submission.
  useEffect(() => {
    if (activePreview.startsWith("file-") && !activeAssignmentFile && assignmentFiles) {
      setActivePreview("submission");
    }
  }, [activePreview, activeAssignmentFile, assignmentFiles]);
  
  // Auto-calculated score (manual when override is set, or rubric is absent)
  const rubricSum = Object.values(scores).reduce((sum, s) => sum + (Number(s.points) || 0), 0);
  const computedScore = hasRubric && !overrideScore
    ? rubricSum
    : Number(manualScore) || 0;

  // Navigation
  const currentIndex = allSubmissions?.findIndex(s => s.id === submissionId) ?? -1;
  const nextSubmission = currentIndex >= 0 && currentIndex < (allSubmissions?.length || 0) - 1 
    ? allSubmissions![currentIndex + 1] 
    : null;
  const prevSubmission = currentIndex > 0 
    ? allSubmissions![currentIndex - 1] 
    : null;

  const navigateTo = (newSubId: number) => {
    if (isDirty && !window.confirm("יש שינויים שלא נשמרו. האם לעזוב בלי לשמור?")) return;
    setLocation(`/assignments/${assignmentId}/grade/${newSubId}`);
  };

  // Actions
  const handleSave = async (andNext = false) => {
    // Guard against double-saves from rapid keyboard repeats while a
    // mutation is already in flight (the disabled buttons cover the
    // mouse path; this covers the keyboard path).
    if (saveScores.isPending || updateSubmission.isPending) return;
    try {
      // 1. Save rubric scores if we have a rubric
      if (hasRubric) {
        const scoresPayload = Object.entries(scores).map(([criterionId, data]) => ({
          criterionId: parseInt(criterionId, 10),
          points: data.points,
          comment: data.comment || undefined
        }));
        
        await saveScores.mutateAsync({
          submissionId,
          data: { scores: scoresPayload }
        });
      }

      // 2. Save submission — persist exactly the status the grader selected
      const finalStatus: SubmissionStatus = submissionStatus;
      await updateSubmission.mutateAsync({
        submissionId,
        data: {
          status: finalStatus,
          score: finalStatus === "missing" ? null : computedScore,
          feedback: feedback || undefined,
          privateNotes: privateNotes || undefined,
          originalityFlag,
          submittedLate,
        },
      });

      toast.success("הבדיקה נשמרה בהצלחה");
      setLastSavedAt(Date.now());
      savedSnapshot.current = currentSnapshot;
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}/rubric-scores`] });
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/submissions`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-submissions"] });

      if (andNext && nextSubmission) {
        setLocation(`/assignments/${assignmentId}/grade/${nextSubmission.id}`);
      }
    } catch (error) {
      toast.error("אירעה שגיאה בשמירת הבדיקה");
    }
  };

  // Keep ref pointing at the latest handleSave for the global key listener.
  handleSaveRef.current = handleSave;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUploadFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get upload URL
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: {
          name: file.name,
          contentType: file.type,
          size: file.size
        }
      });

      // 2. Upload file directly
      const response = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      if (!response.ok) throw new Error("Upload failed");

      // 3. Save to submission
      await attachFile.mutateAsync({
        submissionId,
        data: {
          objectPath,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size
        }
      });

      toast.success(ASSIGNMENT_FILE_TOAST.uploadSuccess);
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}`] });
    } catch (error) {
      toast.error(ASSIGNMENT_FILE_TOAST.uploadFailed);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = async () => {
    setIsRemoving(true);
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const url = `${base}api/submissions/${submissionId}/file`.replace(/\/\//g, "/");
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Remove failed");
      toast.success("הקובץ הוסר בהצלחה");
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}`] });
    } catch {
      toast.error("הסרת הקובץ נכשלה");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleTemplateClick = (templateBody: string) => {
    const newFeedback = feedback ? `${feedback}\n\n${templateBody}` : templateBody;
    setFeedback(newFeedback);
  };

  // Keyboard shortcuts: ⌘/Ctrl+S = save, ⌘/Ctrl+Enter = save & next.
  // Uses handleSaveRef so the listener always sees the latest closure
  // without re-binding on every state change.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "s" && key !== "enter") return;
      // Cmd+S in particular is hijacked from the browser intentionally;
      // we still always trigger save so the user's intent is honored.
      e.preventDefault();
      void handleSaveRef.current(key === "enter");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!submissionId) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Shared hidden file input — rendered at root so it is reachable on mobile
          even though the desktop PDF pane is hidden via CSS */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={ALLOWED_UPLOAD_ACCEPT}
        onChange={handleFileUpload}
      />

      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { if (isDirty && !window.confirm("יש שינויים שלא נשמרו. האם לעזוב בלי לשמור?")) return; setLocation(`/assignments/${assignmentId}`); }} className="gap-1.5 -mr-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
            <span className="hidden sm:inline">חזור למטלה</span>
          </Button>
          <div className="h-4 w-px bg-border mx-1 hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none truncate max-w-[200px] sm:max-w-xs" title={assignment?.name}>
              {assignment?.name}
            </span>
            {isSubmissionLoading ? (
              <Skeleton className="h-3 w-32 mt-1" />
            ) : (
              <span className="text-xs text-muted-foreground truncate leading-none mt-1">
                {submission?.student?.firstName} {submission?.student?.lastName} <span dir="ltr" className="mx-1">({submission?.student?.externalId})</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          <div className="flex items-center bg-muted/50 rounded-md border border-border/50 overflow-hidden mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-none border-l border-border/50" 
                  disabled={!prevSubmission}
                  onClick={() => prevSubmission && navigateTo(prevSubmission.id)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>לסטודנט הקודם</TooltipContent>
            </Tooltip>
            <div className="px-3 text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[60px] text-center" dir="ltr">
              {currentIndex + 1} / {allSubmissions?.length || 0}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-none border-r border-border/50" 
                  disabled={!nextSubmission}
                  onClick={() => nextSubmission && navigateTo(nextSubmission.id)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>לסטודנט הבא</TooltipContent>
            </Tooltip>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 md:hidden"
            onClick={() => {
              setMobileSelectedFile(null);
              setMobileFilesOpen(true);
            }}
            data-testid="button-mobile-preview"
            aria-label="הצג הגשה וקבצים"
          >
            <FileText className="h-3.5 w-3.5" />
            תצוגה
            {sortedAssignmentFiles.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">
                {sortedAssignmentFiles.length + 1}
              </Badge>
            )}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hidden md:flex" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <SaveIndicator
            isSaving={saveScores.isPending || updateSubmission.isPending}
            lastSavedAt={lastSavedAt}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 hidden md:flex"
                onClick={() => handleSave(false)}
                disabled={saveScores.isPending || updateSubmission.isPending}
                data-testid="button-save"
              >
                <Save className="h-3.5 w-3.5" />
                שמור
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>שמור</span>
              <KbdGroup>
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className="h-8 gap-1.5 hidden md:flex"
                onClick={() => handleSave(true)}
                disabled={saveScores.isPending || updateSubmission.isPending || !nextSubmission}
                data-testid="button-save-next"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">שמור והמשך</span>
                <span className="sm:hidden">הבא</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>שמור והמשך לסטודנט הבא</span>
              <KbdGroup>
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>↵</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main Workspace */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
        
        {/* PDF/Preview Pane — hidden on mobile (mobile uses the bottom sheet) */}
        <div className="hidden md:flex flex-1 border-l border-border bg-muted/10 relative overflow-hidden flex-col h-auto" data-testid="pdf-pane">
          {/* Desktop tab strip — switches the iframe between submission and each assignment file */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card/40 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setActivePreview("submission")}
              data-testid="tab-preview-submission"
              className={`flex items-center gap-1.5 px-3 h-8 text-xs rounded-md whitespace-nowrap transition-colors ${
                activePreview === "submission"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              הגשת סטודנט
            </button>

            {sortedAssignmentFiles.length > 0 && (
              <div className="h-5 w-px bg-border mx-1.5" />
            )}

            {sortedAssignmentFiles.map((f) => {
              const tabKey = `file-${f.id}`;
              const typeLabel = FILE_TYPE_LABELS[f.fileType] ?? "חומר נוסף";
              const isActive = activePreview === tabKey;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActivePreview(tabKey)}
                  data-testid={`tab-preview-file-${f.id}`}
                  title={f.name}
                  className={`flex items-center gap-1.5 px-3 h-8 text-xs rounded-md whitespace-nowrap transition-colors max-w-[220px] ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-medium">{typeLabel}</span>
                  <span className={`truncate text-[11px] opacity-70 ${isActive ? '' : 'hidden lg:inline'}`}>
                    · {f.name}
                  </span>
                </button>
              );
            })}

            {activeAssignmentFile && (
              <a
                href={buildAssignmentFileUrl(activeAssignmentFile.id, "download")}
                className="ml-auto flex items-center gap-1.5 px-2 h-8 text-xs rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid={`link-download-file-${activeAssignmentFile.id}`}
                title="הורדת הקובץ"
              >
                <Download className="h-3.5 w-3.5" />
                הורד
              </a>
            )}
          </div>

          {/* Preview area */}
          {activeAssignmentFile ? (
            isAssignmentFileIframePreviewable(
              activeAssignmentFile.contentType,
              activeAssignmentFile.name,
            ) ? (
              <FilePreview
                src={buildAssignmentFileUrl(activeAssignmentFile.id, "preview")}
                className="w-full h-full border-none flex-1"
                title={`Assignment file: ${activeAssignmentFile.name}`}
                testId={`iframe-preview-file-${activeAssignmentFile.id}`}
              />
            ) : (
              <UnsupportedFilePreview
                file={activeAssignmentFile}
                downloadUrl={buildAssignmentFileUrl(activeAssignmentFile.id, "download")}
                kind={
                  getPreviewKind(
                    activeAssignmentFile.contentType,
                    activeAssignmentFile.name,
                  ) as Exclude<PreviewKind, "pdf">
                }
                testId={`fallback-preview-file-${activeAssignmentFile.id}`}
              />
            )
          ) : submission?.fileObjectPath ? (
            <div className="relative flex-1 flex flex-col overflow-hidden">
              <FilePreview
                src={buildSubmissionFileUrl(submission.fileObjectPath)}
                className="w-full h-full border-none flex-1"
                title="Student submission preview"
                testId="iframe-preview-submission"
              />
              <div className="absolute top-2 left-2 flex gap-1 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 gap-1 text-xs shadow"
                      disabled={isUploading || isRemoving}
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="btn-replace-submission-file"
                    >
                      {isUploading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                      החלף
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>החלף קובץ הגשה</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 gap-1 text-xs shadow text-destructive hover:text-destructive"
                      disabled={isUploading || isRemoving}
                      onClick={handleRemoveFile}
                      data-testid="btn-remove-submission-file"
                    >
                      {isRemoving ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      הסר
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>הסר קובץ הגשה</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
              <FileText className="h-16 w-16 mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-medium text-foreground">אין קובץ מצורף</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mb-6">
                הסטודנט לא העלה קובץ למטלה זו, או שהקובץ הוסר.
              </p>

              <Button 
                variant="outline" 
                className="gap-2"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    מעלה קובץ...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    העלאת קובץ במקום הסטודנט
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Grading Pane (Right side visually in RTL) */}
        <div className="w-full md:w-[450px] lg:w-[500px] flex-1 md:flex-none flex flex-col bg-card overflow-hidden shrink-0 h-auto">
          
          {/* Submission Info Bar */}
          <div className="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={submissionStatus}
                onValueChange={(v) => setSubmissionStatus(v as SubmissionStatus)}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs" data-testid="select-submission-status">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {originalityFlag && (
                <Badge variant="outline" className="gap-1.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">
                  <Flag className="h-3 w-3" />
                  דגל מקוריות
                </Badge>
              )}
              {submittedLate && (
                <Badge variant="outline" className="gap-1.5 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400">
                  <AlertCircle className="h-3 w-3" />
                  באיחור
                </Badge>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground">ציון:</span>
              <span className={`text-2xl font-bold ${isGraded ? 'text-primary' : ''}`}>
                {computedScore}
              </span>
              <span className="text-sm text-muted-foreground">/ {assignment?.maxScore || 100}</span>
            </div>
          </div>
          {statusLabel && (
            <span className="sr-only" data-testid="text-submission-status-label">
              {statusLabel}
            </span>
          )}

          <ScrollArea className="flex-1 p-0">
            <div className="p-5 space-y-8 pb-24 md:pb-8">
              
              {/* Rubric Section */}
              {hasRubric ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">מחוון (Rubric)</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="override-score" className="text-xs text-muted-foreground cursor-pointer">
                        עקיפה ידנית
                      </Label>
                      <Switch
                        id="override-score"
                        checked={overrideScore}
                        onCheckedChange={setOverrideScore}
                        data-testid="switch-override-score"
                      />
                    </div>
                  </div>

                  {overrideScore && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 rounded-md p-3 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">ציון מוצע מהמחוון: {rubricSum}</span>
                        <span className="text-[11px] text-muted-foreground">הזן ציון סופי שונה לעקיפה</span>
                      </div>
                      <div className="relative w-24">
                        <Input
                          type="number"
                          min={0}
                          max={assignment?.maxScore || 100}
                          className="h-9 text-center font-mono font-bold"
                          dir="ltr"
                          value={manualScore}
                          onChange={(e) => setManualScore(e.target.value)}
                          data-testid="input-manual-override-score"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {rubric.sort((a, b) => a.orderIndex - b.orderIndex).map((criterion) => (
                      <Card key={criterion.id} className="border border-border/60 shadow-sm overflow-hidden">
                        <div className="p-3 bg-muted/30 border-b border-border/50 flex justify-between items-center">
                          <h4 className="font-medium text-sm">{criterion.name}</h4>
                          <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                            {criterion.maxPoints} נק׳
                          </span>
                        </div>
                        <CardContent className="p-3 space-y-3">
                          {criterion.description && (
                            <p className="text-xs text-muted-foreground mb-3">{criterion.description}</p>
                          )}
                          
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Input 
                                type="text"
                                placeholder="הערה לקריטריון..." 
                                className="h-8 text-sm"
                                value={scores[criterion.id]?.comment || ""}
                                onChange={(e) => setScores(prev => ({
                                  ...prev,
                                  [criterion.id]: { ...prev[criterion.id], comment: e.target.value }
                                }))}
                              />
                            </div>
                            <div className="w-20 relative shrink-0">
                              <Input 
                                type="number" 
                                min={0} 
                                max={criterion.maxPoints}
                                className="h-8 text-center font-mono font-medium"
                                dir="ltr"
                                value={scores[criterion.id]?.points === 0 && !isGraded ? "" : scores[criterion.id]?.points}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  // Clamp value
                                  const clamped = Math.max(0, Math.min(criterion.maxPoints, val));
                                  setScores(prev => ({
                                    ...prev,
                                    [criterion.id]: { ...prev[criterion.id], points: clamped }
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">ציון חופשי</h3>
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                    <span className="font-medium">הזן ציון:</span>
                    <div className="relative w-24">
                      <Input 
                        type="number" 
                        min={0} 
                        max={assignment?.maxScore || 100}
                        className="text-xl font-bold text-center h-12"
                        dir="ltr"
                        value={manualScore}
                        onChange={(e) => setManualScore(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* General Feedback Section */}
              <div className="space-y-3 pb-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">משוב כללי</h3>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 bg-background">
                        <MessageSquare className="h-3 w-3" />
                        הוסף תבנית משוב
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <div className="p-3 border-b border-border bg-muted/20">
                        <h4 className="font-medium text-sm">תבניות משוב</h4>
                      </div>
                      <ScrollArea className="h-64">
                        {templates && templates.length > 0 ? (
                          <div className="p-2 space-y-1">
                            {templates.map(template => (
                              <button
                                key={template.id}
                                className="w-full text-right p-2 rounded-md hover:bg-muted text-sm transition-colors flex flex-col gap-1 border border-transparent hover:border-border"
                                onClick={() => handleTemplateClick(template.body)}
                              >
                                <span className="font-medium">{template.title}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1">{template.body}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            לא נמצאו תבניות משוב. ניתן ליצור תבניות בעמוד "תבניות משוב".
                          </div>
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Textarea 
                  placeholder="הקלד משוב לסטודנט כאן..." 
                  className="min-h-[150px] resize-none bg-background leading-relaxed"
                  dir="auto"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <Separator />

              {/* Workflow Flags */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">סימונים</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between border border-border rounded-md p-3 bg-background">
                    <Label htmlFor="originality-flag" className="flex items-center gap-2 cursor-pointer text-sm">
                      <Flag className="h-4 w-4 text-red-600" />
                      דגל מקוריות
                    </Label>
                    <Switch
                      id="originality-flag"
                      checked={originalityFlag}
                      onCheckedChange={setOriginalityFlag}
                      data-testid="switch-originality-flag"
                    />
                  </div>
                  <div className="flex items-center justify-between border border-border rounded-md p-3 bg-background">
                    <Label htmlFor="submitted-late" className="flex items-center gap-2 cursor-pointer text-sm">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      הוגש באיחור
                    </Label>
                    <Switch
                      id="submitted-late"
                      checked={submittedLate}
                      onCheckedChange={setSubmittedLate}
                      data-testid="switch-submitted-late"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Private Notes */}
              <div className="space-y-3 pb-8">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    הערות פרטיות (לא נשלחות לסטודנט)
                  </h3>
                </div>
                <Textarea
                  placeholder="הערות אישיות לבודק בלבד..."
                  className="min-h-[100px] resize-none bg-amber-50/40 dark:bg-amber-950/10 leading-relaxed border-amber-200/60"
                  dir="auto"
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  data-testid="textarea-private-notes"
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile: sticky bottom action bar with save shortcuts */}
      <div className="md:hidden flex-shrink-0 border-t border-border bg-card/95 backdrop-blur p-2 flex gap-2 shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.15)]">
        <Button
          variant="outline"
          className="flex-1 h-10 gap-1.5"
          onClick={() => handleSave(false)}
          disabled={saveScores.isPending || updateSubmission.isPending}
          data-testid="button-mobile-save"
        >
          <Save className="h-4 w-4" />
          שמור
        </Button>
        <Button
          className="flex-1 h-10 gap-1.5"
          onClick={() => handleSave(true)}
          disabled={saveScores.isPending || updateSubmission.isPending || !nextSubmission}
          data-testid="button-mobile-save-next"
        >
          <CheckCircle2 className="h-4 w-4" />
          שמור והמשך
        </Button>
      </div>

      {/* Mobile: full-screen sheet for student submission + assignment files */}
      <Sheet open={mobileFilesOpen} onOpenChange={setMobileFilesOpen}>
        <SheetContent
          side="bottom"
          className="h-[100dvh] w-full max-w-none p-0 flex flex-col gap-0 sm:max-w-none"
          data-testid="sheet-mobile-preview"
        >
          <SheetHeader className="px-4 py-3 border-b border-border text-right shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              תצוגת הגשה וקבצים
            </SheetTitle>
            <SheetDescription className="text-xs">
              צפה בהגשת הסטודנט ובחומרי המטלה. הציון נשאר זמין מתחת.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/20 overflow-x-auto shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMobileSelectedFile(null)}
                  data-testid="mobile-tab-submission"
                  className={`flex items-center gap-1.5 px-3 h-8 text-xs rounded-md whitespace-nowrap shrink-0 ${
                    mobileSelectedFile === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground border border-border"
                  }`}
                >
                  <UserIcon className="h-3 w-3" />
                  הגשת סטודנט
                </button>
                {sortedAssignmentFiles.length > 0 && (
                  <div className="h-5 w-px bg-border mx-0.5 shrink-0" />
                )}
                {sortedAssignmentFiles.map((f) => {
                  const isActive = mobileSelectedFile?.id === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMobileSelectedFile(f)}
                      data-testid={`mobile-tab-file-${f.id}`}
                      className={`flex items-center gap-1.5 px-3 h-8 text-xs rounded-md whitespace-nowrap shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground border border-border"
                      }`}
                    >
                      <Paperclip className="h-3 w-3" />
                      {FILE_TYPE_LABELS[f.fileType] ?? "חומר"}
                    </button>
                  );
                })}
              </div>
            </div>

            {mobileSelectedFile && (
              <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">
                    {mobileSelectedFile.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground" dir="ltr">
                    {mobileSelectedFile.contentType} · {Math.round(mobileSelectedFile.size / 1024)} KB
                  </div>
                </div>
                <a
                  href={buildAssignmentFileUrl(mobileSelectedFile.id, "download")}
                  className="flex items-center gap-1.5 px-2.5 h-8 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                  data-testid={`mobile-download-file-${mobileSelectedFile.id}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  הורד
                </a>
              </div>
            )}

            <div className="flex-1 bg-muted/10 overflow-hidden flex flex-col">
              {mobileSelectedFile ? (
                isAssignmentFileIframePreviewable(
                  mobileSelectedFile.contentType,
                  mobileSelectedFile.name,
                ) ? (
                  <FilePreview
                    src={buildAssignmentFileUrl(mobileSelectedFile.id, "preview")}
                    className="w-full h-full border-none"
                    title={`Assignment file: ${mobileSelectedFile.name}`}
                    testId={`mobile-iframe-file-${mobileSelectedFile.id}`}
                  />
                ) : (
                  <UnsupportedFilePreview
                    file={mobileSelectedFile}
                    downloadUrl={buildAssignmentFileUrl(mobileSelectedFile.id, "download")}
                    kind={
                      getPreviewKind(
                        mobileSelectedFile.contentType,
                        mobileSelectedFile.name,
                      ) as Exclude<PreviewKind, "pdf">
                    }
                    testId={`mobile-fallback-preview-file-${mobileSelectedFile.id}`}
                  />
                )
              ) : submission?.fileObjectPath ? (
                <div className="relative w-full h-full flex flex-col overflow-hidden">
                  <FilePreview
                    src={buildSubmissionFileUrl(submission.fileObjectPath)}
                    className="w-full h-full border-none"
                    title="Student submission preview"
                    testId="mobile-iframe-submission"
                  />
                  <div className="absolute top-2 left-2 flex gap-1 z-10">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 gap-1 text-xs shadow"
                      disabled={isUploading || isRemoving}
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="mobile-btn-replace-submission-file"
                    >
                      {isUploading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                      החלף
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 gap-1 text-xs shadow text-destructive hover:text-destructive"
                      disabled={isUploading || isRemoving}
                      onClick={handleRemoveFile}
                      data-testid="mobile-btn-remove-submission-file"
                    >
                      {isRemoving ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      הסר
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">הסטודנט לא העלה קובץ למטלה זו.</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}