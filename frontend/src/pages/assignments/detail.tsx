import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetAssignment,
  useListSubmissions as useGetAssignmentSubmissions,
  useGetRubric as useGetAssignmentRubric,
  useSetRubric,
  useListAssignmentFiles,
  useAttachAssignmentFile,
  useUpdateAssignmentFile,
  useDeleteAssignmentFile,
  useRequestUploadUrl,
  useCloseAssignment,
  useReopenAssignment,
  exportAssignmentCsv,
  AssignmentFileFileType,
  type AssignmentFileInputFileType,
} from "@workspace/api-client-react";
import {
  Users,
  FileText,
  Search,
  ChevronRight,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Settings2,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Calendar,
  Paperclip,
  Pencil,
  UploadCloud,
  Check,
  X,
  Lock,
  LockOpen,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ASSIGNMENT_FILE_TOAST,
  buildAssignmentFileUrl,
  getPreviewKind,
  isInlinePreviewable,
  PREVIEW_BADGE_LABEL,
  PREVIEW_FALLBACK_MESSAGE,
  validateUploadFile,
} from "@/lib/assignment-files";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:      { label: 'לא נבדק',          color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',   icon: '⏳' },
  in_progress:  { label: 'בתהליך',           color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30',        icon: '✏️' },
  needs_review: { label: 'דורש בדיקה חוזרת', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30', icon: '🔁' },
  graded:       { label: 'נבדק',             color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30',   icon: '✓' },
  returned:     { label: 'הוחזר',            color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30', icon: '↩️' },
  missing:      { label: 'חסר הגשה',         color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',             icon: '✕' },
};

const FILE_TYPE_LABELS: Record<string, string> = {
  instructions: "הנחיות",
  grading_guide: "מחוון בדיקה (PDF)",
  reference: "פתרון לדוגמה",
  extra: "חומר נוסף",
};

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const rubricSchema = z.object({
  criteria: z.array(
    z.object({
      id: z.number().optional(), // For existing
      name: z.string().min(1, "שם קריטריון נדרש"),
      description: z.string().optional(),
      maxPoints: z.coerce.number().min(0, "מספר נקודות חייב להיות חיובי"),
      weight: z.coerce.number().min(0).max(100),
      orderIndex: z.number()
    })
  ).min(1, "חייב להיות לפחות קריטריון אחד")
});

type RubricFormValues = z.infer<typeof rubricSchema>;

export default function AssignmentDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const assignmentId = parseInt(params.id || "0", 10);
  
  const [activeTab, setActiveTab] = useState("gradebook");
  const [searchQuery, setSearchQuery] = useState("");
  
  const queryClient = useQueryClient();
  
  const { data: assignment, isLoading: isAssignmentLoading } = useGetAssignment(assignmentId);
  const { data: submissions, isLoading: isSubmissionsLoading } = useGetAssignmentSubmissions(assignmentId);
  const { data: rubric, isLoading: isRubricLoading } = useGetAssignmentRubric(assignmentId);
  const { data: assignmentFiles, isLoading: isFilesLoading } = useListAssignmentFiles(assignmentId);

  const setRubric = useSetRubric();
  const closeAssignment = useCloseAssignment();
  const reopenAssignment = useReopenAssignment();
  const attachFile = useAttachAssignmentFile();
  const updateFile = useUpdateAssignmentFile();
  const deleteFile = useDeleteAssignmentFile();
  const requestUpload = useRequestUploadUrl();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileType, setPendingFileType] = useState<AssignmentFileInputFileType>(
    AssignmentFileFileType.instructions,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [replacingFileId, setReplacingFileId] = useState<number | null>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState("");

  const handleExportCsv = async () => {
    try {
      const csv = await exportAssignmentCsv(assignmentId);
      const slug = (assignment?.name ?? "assignment").replace(/\s+/g, "_").slice(0, 40);
      downloadCsv(`${slug}_grades.csv`, csv);
      toast.success("יצוא ציוני המטלה הסתיים");
    } catch {
      toast.error("ייצוא נכשל");
    }
  };

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: { name: file.name, contentType: file.type, size: file.size },
      });
      const resp = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!resp.ok) throw new Error("upload failed");
      await attachFile.mutateAsync({
        assignmentId,
        data: {
          name: file.name,
          objectPath,
          contentType: file.type,
          size: file.size,
          fileType: pendingFileType,
        },
      });
      toast.success(ASSIGNMENT_FILE_TOAST.uploadSuccess);
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/files`] });
    } catch {
      toast.error(ASSIGNMENT_FILE_TOAST.uploadFailed);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangeFileType = (fileId: number, fileType: AssignmentFileInputFileType) => {
    updateFile.mutate(
      { assignmentId, fileId, data: { fileType } },
      {
        onSuccess: () => {
          toast.success("סוג הקובץ עודכן");
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/files`] });
        },
        onError: () => toast.error("עדכון נכשל"),
      },
    );
  };

  const handleDeleteFile = (fileId: number) => {
    if (!confirm("למחוק את הקובץ הזה?")) return;
    deleteFile.mutate(
      { assignmentId, fileId },
      {
        onSuccess: () => {
          toast.success(ASSIGNMENT_FILE_TOAST.deleteSuccess);
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/files`] });
        },
        onError: () => toast.error(ASSIGNMENT_FILE_TOAST.deleteFailed),
      },
    );
  };

  const handleStartRename = (fileId: number, currentName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  };

  const handleSaveRename = (fileId: number) => {
    const trimmed = editingFileName.trim();
    setEditingFileId(null);
    if (!trimmed) return;
    updateFile.mutate(
      { assignmentId, fileId, data: { name: trimmed } },
      {
        onSuccess: () => {
          toast.success("שם הקובץ עודכן");
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/files`] });
        },
        onError: () => toast.error("עדכון שם נכשל"),
      },
    );
  };

  const handleCancelRename = () => {
    setEditingFileId(null);
    setEditingFileName("");
  };

  const handleReplaceClick = (fileId: number) => {
    setReplacingFileId(fileId);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    if (!file || !replacingFileId) { setReplacingFileId(null); return; }

    const validation = validateUploadFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      setReplacingFileId(null);
      return;
    }

    const currentFile = assignmentFiles?.find((f) => f.id === replacingFileId);
    const fileType = (currentFile?.fileType ?? AssignmentFileFileType.instructions) as AssignmentFileInputFileType;
    const oldFileId = replacingFileId;
    setReplacingFileId(null);
    setIsUploading(true);

    try {
      const { uploadURL, objectPath } = await requestUpload.mutateAsync({
        data: { name: file.name, contentType: file.type, size: file.size },
      });
      const resp = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!resp.ok) throw new Error("upload failed");

      await deleteFile.mutateAsync({ assignmentId, fileId: oldFileId });
      await attachFile.mutateAsync({
        assignmentId,
        data: { name: file.name, objectPath, contentType: file.type, size: file.size, fileType },
      });
      toast.success("הקובץ הוחלף בהצלחה");
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/files`] });
    } catch {
      toast.error("החלפת הקובץ נכשלה");
    } finally {
      setIsUploading(false);
    }
  };

  const defaultCriteria: RubricFormValues["criteria"] =
    rubric && rubric.length > 0
      ? rubric.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? "",
          maxPoints: c.maxPoints,
          weight: c.weight,
          orderIndex: c.orderIndex,
        }))
      : [{ name: "", description: "", maxPoints: 100, weight: 100, orderIndex: 0 }];

  const form = useForm<RubricFormValues>({
    resolver: zodResolver(rubricSchema),
    defaultValues: { criteria: defaultCriteria },
  });

  useEffect(() => {
    if (rubric && rubric.length > 0) {
      form.reset({
        criteria: rubric.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? "",
          maxPoints: c.maxPoints,
          weight: c.weight,
          orderIndex: c.orderIndex,
        })),
      });
    }
  }, [rubric, form]);

  const { fields, append, remove } = useFieldArray<RubricFormValues>({
    control: form.control,
    name: "criteria",
  });

  if (!assignmentId) {
    setLocation("/assignments");
    return null;
  }

  const onSubmitRubric = (data: RubricFormValues) => {
    const criteria = data.criteria.map((c, i) => ({
      name: c.name,
      description: c.description ?? "",
      maxPoints: c.maxPoints,
      weight: c.weight,
      orderIndex: i,
    }));

    setRubric.mutate(
      { assignmentId, data: { criteria } },
      {
        onSuccess: () => {
          toast.success("המחוון נשמר בהצלחה");
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}/rubric`] });
        },
        onError: () => toast.error("אירעה שגיאה בשמירת המחוון")
      }
    );
  };

  const filteredSubmissions = submissions?.filter(s => 
    !searchQuery || 
    (s.student?.firstName && s.student.firstName.includes(searchQuery)) || 
    (s.student?.lastName && s.student.lastName.includes(searchQuery)) || 
    (s.student?.externalId && s.student.externalId.includes(searchQuery))
  );

  const DONE_STATUSES = new Set(['graded', 'returned', 'missing', 'needs_review']);
  const gradedCount = submissions?.filter(s => DONE_STATUSES.has(s.status ?? '')).length || 0;
  const totalCount = submissions?.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground flex-wrap">
          <button onClick={() => setLocation("/assignments")} className="hover:text-foreground transition-colors">
            מטלות
          </button>
          <ChevronRight className="h-4 w-4 mx-2 rtl:rotate-180" />
          <button 
            onClick={() => assignment?.courseId && setLocation(`/courses/${assignment.courseId}`)} 
            className="hover:text-foreground transition-colors truncate max-w-[40vw]"
          >
            {isAssignmentLoading ? <Skeleton className="h-4 w-16 inline-block" /> : assignment?.courseName}
          </button>
          <ChevronRight className="h-4 w-4 mx-2 rtl:rotate-180" />
          <span className="text-foreground font-medium truncate max-w-[40vw]">
            {isAssignmentLoading ? <Skeleton className="h-4 w-24 inline-block" /> : assignment?.name}
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
          <div className="flex-1 w-full min-w-0">
            {isAssignmentLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-card-foreground break-words">
                    {assignment?.name}
                  </h1>
                  {assignment?.closed && (
                    <Badge variant="secondary" className="gap-1.5 text-sm">
                      <Lock className="h-3.5 w-3.5" />
                      סגורה
                    </Badge>
                  )}
                </div>
                {assignment?.description && (
                  <p className="text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                    {assignment.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-muted-foreground text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">מקסימום נקודות:</span> {assignment?.maxScore}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-border"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">משקל מהציון הסופי:</span> {assignment?.weight}%
                  </div>
                  {assignment?.dueDate && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-border"></div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span dir="ltr">{new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(assignment.dueDate))}</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="w-full sm:w-64 space-y-3">
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg border border-border/50">
              <div className="flex justify-between text-sm font-medium">
                <span>התקדמות בדיקה</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="text-xs text-muted-foreground text-left mt-1" dir="ltr">
                {gradedCount} / {totalCount} graded
              </div>
            </div>
            {assignment && (
              assignment.closed ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    reopenAssignment.mutate({ assignmentId }, {
                      onSuccess: () => {
                        toast.success("המטלה נפתחה מחדש");
                        queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}`] });
                        queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
                      },
                      onError: () => toast.error("שגיאה בפתיחת המטלה"),
                    });
                  }}
                  disabled={reopenAssignment.isPending}
                >
                  <LockOpen className="h-4 w-4" />
                  פתח מחדש
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    closeAssignment.mutate({ assignmentId }, {
                      onSuccess: () => {
                        toast.success("המטלה סגורה");
                        queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignmentId}`] });
                        queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
                      },
                      onError: () => toast.error("שגיאה בסגירת המטלה"),
                    });
                  }}
                  disabled={closeAssignment.isPending}
                >
                  <Lock className="h-4 w-4" />
                  סגור מטלה
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-2xl grid grid-cols-3 h-auto">
          <TabsTrigger value="gradebook" className="gap-1.5 text-xs sm:text-sm sm:gap-2 px-2 sm:px-3">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate"><span className="sm:hidden">הגשות</span><span className="hidden sm:inline">רשימת הגשות</span></span>
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5 text-xs sm:text-sm sm:gap-2 px-2 sm:px-3" data-testid="tab-assignment-files">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="truncate"><span className="sm:hidden">קבצים</span><span className="hidden sm:inline">קבצי המטלה</span></span>
          </TabsTrigger>
          <TabsTrigger value="rubric" className="gap-1.5 text-xs sm:text-sm sm:gap-2 px-2 sm:px-3">
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="truncate"><span className="sm:hidden">מחוון</span><span className="hidden sm:inline">עריכת מחוון</span></span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 border border-border rounded-xl bg-card shadow-sm overflow-hidden min-h-[400px]">
          {/* Gradebook Tab */}
          <TabsContent value="gradebook" className="m-0 border-none outline-none">
            <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-muted/20">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="חיפוש לפי שם או ת.ז..." 
                  className="pr-10 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-background text-primary hover:text-primary self-start sm:self-auto"
                onClick={handleExportCsv}
                data-testid="button-export-assignment-csv"
              >
                <Download className="h-4 w-4" />
                <span className="sm:inline">יצוא לציונים</span>
              </Button>
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="text-right w-[150px]">ת.ז / מזהה</TableHead>
                    <TableHead className="text-right">סטודנט</TableHead>
                    <TableHead className="text-right w-[120px]">סטטוס</TableHead>
                    <TableHead className="text-right w-[100px]">ציון</TableHead>
                    <TableHead className="text-right">הערה אחרונה</TableHead>
                    <TableHead className="w-[120px] text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSubmissionsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full max-w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 rounded-md" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((sub, i) => {
                      const statusKey = sub.status ?? 'pending';
                      const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG['pending'];
                      
                      return (
                        <motion.tr 
                          key={sub.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group hover:bg-muted/30 cursor-pointer"
                          onClick={() => setLocation(`/assignments/${assignmentId}/grade/${sub.id}`)}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground text-right" dir="ltr">
                            {sub.student?.externalId}
                          </TableCell>
                          <TableCell className="font-medium">
                            {sub.student?.firstName} {sub.student?.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1.5 ${statusCfg.color}`}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-lg">
                            {statusKey === 'graded' && sub.score !== null ? sub.score : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[200px]">
                            {sub.feedback ? (
                              <span className="truncate block" title={sub.feedback}>{sub.feedback}</span>
                            ) : (
                              <span className="text-muted-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button   
                              size="sm"
                              variant={statusKey === 'graded' ? "outline" : "default"}
                              className="w-full text-xs h-8"
                            >
                                {statusKey === 'graded' ? "ערוך בדיקה" : "התחל לבדוק"}
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Users className="h-12 w-12 mb-4 opacity-20" />
                          <h3 className="text-lg font-medium text-foreground">אין הגשות למטלה זו</h3>
                          <p className="max-w-sm mt-1">הגשות הסטודנטים יופיעו כאן. המערכת מייצרת רשומות ריקות עבור כל סטודנט בקורס ברגע שמטלה נוצרת.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {isSubmissionsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))
              ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub, i) => {
                  const statusKey = sub.status ?? 'pending';
                  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG['pending'];
                  return (
                    <motion.button
                      key={sub.id}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setLocation(`/assignments/${assignmentId}/grade/${sub.id}`)}
                      className="w-full text-right p-4 hover:bg-muted/30 active:bg-muted/40 transition-colors flex flex-col gap-2"
                      data-testid={`mobile-row-submission-${sub.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {sub.student?.firstName} {sub.student?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
                            {sub.student?.externalId}
                          </div>
                        </div>
                        <Badge variant="outline" className={`gap-1.5 shrink-0 ${statusCfg.color}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">ציון: </span>
                          <span className="font-semibold">
                            {statusKey === 'graded' && sub.score !== null ? sub.score : '—'}
                          </span>
                          {assignment?.maxScore && (
                            <span className="text-muted-foreground"> / {assignment.maxScore}</span>
                          )}
                        </div>
                        <span className="text-primary text-xs font-medium">
                          {statusKey === 'graded' ? "ערוך בדיקה" : "התחל לבדוק"}
                          <ChevronRight className="inline h-3.5 w-3.5 -mt-px rtl:rotate-180" />
                        </span>
                      </div>
                      {sub.feedback && (
                        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {sub.feedback}
                        </div>
                      )}
                    </motion.button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <Users className="h-12 w-12 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-foreground">אין הגשות למטלה זו</h3>
                  <p className="text-sm mt-1">הגשות הסטודנטים יופיעו כאן.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="m-0 border-none outline-none">
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
                <div>
                  <h2 className="text-xl font-bold">קבצי המטלה</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    העלה הנחיות, מחוון, פתרונות לדוגמה וחומרי רקע. הקבצים זמינים לבודקים בעת בדיקה.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select
                    value={pendingFileType}
                    onValueChange={(v) => setPendingFileType(v as AssignmentFileInputFileType)}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-file-type">
                      <SelectValue placeholder="סוג קובץ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AssignmentFileFileType).map(([k, v]) => (
                        <SelectItem key={k} value={v}>
                          {FILE_TYPE_LABELS[v] ?? v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={ALLOWED_UPLOAD_ACCEPT}
                    onChange={handleFileUploadChange}
                    data-testid="input-assignment-file"
                  />
                  <input
                    type="file"
                    ref={replaceFileInputRef}
                    className="hidden"
                    accept={ALLOWED_UPLOAD_ACCEPT}
                    onChange={handleReplaceFileChange}
                    data-testid="input-replace-assignment-file"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                    data-testid="button-upload-assignment-file"
                  >
                    {isUploading ? <Clock className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? "מעלה..." : "העלאת קובץ"}
                  </Button>
                </div>
              </div>

              {isFilesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : assignmentFiles && assignmentFiles.length > 0 ? (
                <div className="space-y-2">
                  {assignmentFiles.map((file) => {
                    const kind = getPreviewKind(file.contentType, file.name);
                    const canPreview = isInlinePreviewable(kind);
                    const primaryUrl = canPreview
                      ? buildAssignmentFileUrl(file.id, "preview")
                      : buildAssignmentFileUrl(file.id, "download");
                    const downloadUrl = buildAssignmentFileUrl(file.id, "download");
                    // Narrow to the kinds we actually have fallback copy for.
                    const fallbackKind: "docx" | "doc" | "other" | null =
                      kind === "docx" || kind === "doc" || kind === "other" ? kind : null;
                    return (
                      <div
                        key={file.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 border border-border rounded-lg p-3 bg-card hover-elevate"
                        data-testid={`row-assignment-file-${file.id}`}
                        data-preview-kind={kind}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {editingFileId === file.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  autoFocus
                                  value={editingFileName}
                                  onChange={(e) => setEditingFileName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveRename(file.id);
                                    if (e.key === "Escape") handleCancelRename();
                                  }}
                                  onBlur={() => handleSaveRename(file.id)}
                                  className="h-7 text-sm px-2 py-1"
                                  data-testid={`input-rename-file-${file.id}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 shrink-0"
                                  onMouseDown={(e) => { e.preventDefault(); handleSaveRename(file.id); }}
                                  title="שמור שם"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                                  onMouseDown={(e) => { e.preventDefault(); handleCancelRename(); }}
                                  title="ביטול"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a
                                  href={primaryUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-sm hover:underline break-all"
                                  data-testid={`link-assignment-file-${file.id}`}
                                >
                                  {file.name}
                                </a>
                                {fallbackKind && (
                                  <span
                                    className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                                    title={PREVIEW_FALLBACK_MESSAGE[fallbackKind]}
                                    data-testid={`badge-preview-kind-${file.id}`}
                                  >
                                    {PREVIEW_BADGE_LABEL[fallbackKind]}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground/50 hover:text-foreground shrink-0"
                                  onClick={() => handleStartRename(file.id, file.name)}
                                  title="שינוי שם"
                                  data-testid={`button-rename-file-${file.id}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                              {file.contentType} · {Math.round(file.size / 1024)} KB
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-1 justify-end">
                          <Select
                            value={file.fileType}
                            onValueChange={(v) =>
                              handleChangeFileType(file.id, v as AssignmentFileInputFileType)
                            }
                          >
                            <SelectTrigger
                              className="flex-1 sm:flex-none sm:w-[160px] h-8 text-xs"
                              data-testid={`select-file-type-${file.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(AssignmentFileFileType).map(([k, v]) => (
                                <SelectItem key={k} value={v}>
                                  {FILE_TYPE_LABELS[v] ?? v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleReplaceClick(file.id)}
                            disabled={isUploading}
                            title="החלפת קובץ"
                            data-testid={`button-replace-file-${file.id}`}
                          >
                            <UploadCloud className="h-4 w-4" />
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="הורד את הקובץ"
                            data-testid={`button-download-file-${file.id}`}
                          >
                            <a href={downloadUrl}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteFile(file.id)}
                            data-testid={`button-delete-file-${file.id}`}
                            title="מחיקת קובץ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg p-12 text-center">
                  <Paperclip className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <h3 className="font-medium">עדיין לא הועלו קבצים למטלה</h3>
                  <p className="text-sm text-muted-foreground mt-1">בחר סוג קובץ והעלה את ההנחיות, המחוון או חומרים אחרים.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Rubric Tab */}
          <TabsContent value="rubric" className="m-0 border-none outline-none">
            <div className="p-4 md:p-6 max-w-4xl mx-auto pb-28 md:pb-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold">מחוון בדיקה (Rubric)</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  הגדר קריטריונים שיעזרו לך לבדוק את המטלות בצורה עקבית והוגנת. הציון הסופי יחושב אוטומטית מסך הקריטריונים.
                </p>
              </div>

              {isRubricLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitRubric)} className="space-y-6">
                    <div className="space-y-4">
                      <AnimatePresence>
                        {fields.map((field, index) => (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-card border border-border rounded-xl shadow-sm p-4 relative group"
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab p-2 hidden sm:block">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            <div className="sm:pr-8 flex justify-between items-start gap-4">
                              <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                  <div className="sm:col-span-8">
                                    <FormField
                                      control={form.control}
                                      name={`criteria.${index}.name`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={index !== 0 ? "sr-only sm:not-sr-only sm:hidden" : ""}>שם הקריטריון</FormLabel>
                                          <FormControl>
                                            <Input placeholder="לדוגמה: איכות הקוד, עיצוב מסד הנתונים..." {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="sm:col-span-4">
                                    <FormField
                                      control={form.control}
                                      name={`criteria.${index}.maxPoints`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={index !== 0 ? "sr-only sm:not-sr-only sm:hidden" : ""}>נקודות</FormLabel>
                                          <FormControl>
                                            <div className="relative">
                                              <Input type="number" min={0} {...field} className="pl-12" />
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">נק׳</span>
                                            </div>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name={`criteria.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="תיאור מורחב של מה שנדרש בקריטריון זה (אופציונלי)..." 
                                          className="resize-none h-16 text-sm" 
                                          {...field} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                disabled={fields.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-border">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => append({ name: "", description: "", maxPoints: 10, weight: 10, orderIndex: fields.length })}
                        className="w-full sm:w-auto gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        הוסף קריטריון
                      </Button>
                      
                      <div className="hidden sm:flex items-center gap-4">
                        <div className="text-sm">
                          סה"כ נקודות: <strong className="text-primary">{form.watch("criteria").reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0)}</strong>
                        </div>
                        <Button 
                          type="submit" 
                          className="gap-2" 
                          disabled={setRubric.isPending}
                        >
                          {setRubric.isPending ? "שומר..." : (
                            <>
                              <Save className="h-4 w-4" />
                              שמור מחוון
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Mobile sticky save bar */}
                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 flex items-center gap-3 shadow-lg">
                      <div className="text-sm flex-1">
                        סה"כ: <strong className="text-primary">{form.watch("criteria").reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0)}</strong> נק׳
                      </div>
                      <Button 
                        type="submit" 
                        className="gap-2" 
                        disabled={setRubric.isPending}
                        data-testid="button-save-rubric-mobile"
                      >
                        {setRubric.isPending ? "שומר..." : (
                          <>
                            <Save className="h-4 w-4" />
                            שמור מחוון
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}