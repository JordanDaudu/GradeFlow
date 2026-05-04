import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useListStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useImportStudents,
  useListCourses,
  type Student,
} from "@workspace/api-client-react";
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Mail, 
  Phone,
  Pencil,
  Upload,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const studentSchema = z.object({
  externalId: z.string().min(1, "תעודת זהות / מספר סטודנט נדרש"),
  firstName: z.string().min(1, "שם פרטי נדרש"),
  lastName: z.string().min(1, "שם משפחה נדרש"),
  email: z.string().email("אימייל לא חוקית").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type StudentFormValues = z.infer<typeof studentSchema>;

type CsvPreview = {
  rows: number;
  headers: string[];
};

function getCsvPreview(csv: string): CsvPreview {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: 0, headers: [] };
  }

  return {
    rows: Math.max(lines.length - 1, 0),
    headers: lines[0]
      .replace(/^\uFEFF/, "")
      .split(",")
      .map((header) => header.trim())
      .filter(Boolean),
  };
}


function studentToFormValues(s: Student): StudentFormValues {
  return {
    externalId: s.externalId,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email ?? "",
    phone: s.phone ?? "",
    notes: s.notes ?? "",
  };
}

function StudentFormFields({ control }: { control: Control<StudentFormValues> }) {
  return (
    <>
      <FormField
        control={control}
        name="externalId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>תעודת זהות / מזהה ייחודי</FormLabel>
            <FormControl>
              <Input placeholder="ת.ז / מזהה סטודנט" {...field} dir="ltr" className="text-right" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>שם פרטי</FormLabel>
              <FormControl>
                <Input placeholder="ישראל" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>שם משפחה</FormLabel>
              <FormControl>
                <Input placeholder="ישראלי" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>אימייל (אופציונלי)</FormLabel>
            <FormControl>
              <Input
                placeholder="student@example.com"
                type="email"
                {...field}
                dir="ltr"
                className="text-right"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>טלפון (אופציונלי)</FormLabel>
            <FormControl>
              <Input placeholder="050-0000000" {...field} dir="ltr" className="text-right" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>הערות (אופציונלי)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="הערות מיוחדות לגבי הסטודנט..."
                {...field}
                className="resize-none h-20"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportHelpOpen, setIsImportHelpOpen] = useState(false);
  const [selectedImportCourseId, setSelectedImportCourseId] = useState("");
  const [importCsvContent, setImportCsvContent] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const csvImportInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const { data: students, isLoading } = useListStudents(
    searchQuery ? { q: searchQuery } : undefined,
  );
  const { data: courses, isLoading: isCoursesLoading } = useListCourses({ includeArchived: true });
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const importStudents = useImportStudents();

  const createForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      externalId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const editForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      externalId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (editStudent) {
      editForm.reset(studentToFormValues(editStudent));
    }
  }, [editStudent, editForm]);

  const filteredStudents = students?.filter(s => 
    !searchQuery || 
    s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.externalId.includes(searchQuery)
  );

  const selectedImportCourse = courses?.find((course) => String(course.id) === selectedImportCourseId);
  const importPreview = useMemo(
    () => (importCsvContent ? getCsvPreview(importCsvContent) : null),
    [importCsvContent],
  );

  const resetImportDialog = () => {
    setSelectedImportCourseId("");
    setImportCsvContent("");
    setImportFileName("");
    if (csvImportInputRef.current) csvImportInputRef.current.value = "";
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImportCsvContent("");
      setImportFileName("");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("יש לבחור קובץ CSV בלבד");
      event.target.value = "";
      return;
    }

    setImportFileName(file.name);
    setImportCsvContent(await file.text());
  };

  const handleImportStudents = async () => {
    const courseId = Number(selectedImportCourseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      toast.error("יש לבחור קורס יעד");
      return;
    }

    if (!importCsvContent.trim()) {
      toast.error("יש לבחור קובץ CSV");
      return;
    }

    try {
      const result = await importStudents.mutateAsync({
        data: { csv: importCsvContent, courseId },
      });

      toast.success(
        `יובאו ${result.created} סטודנטים חדשים, עודכנו ${result.updated}, שויכו ${result.enrolled} לקורס`,
      );

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} שורות לא יובאו. ניתן לראות פירוט בחלון הייבוא.`);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/students`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });

      setIsImportOpen(false);
      resetImportDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ייבוא ה-CSV נכשל");
    }
  };

  const onSubmitCreate = (data: StudentFormValues) => {
    const payload = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
    };
    createStudent.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast.success("סטודנט נוסף בהצלחה");
          setIsCreateOpen(false);
          createForm.reset();
          queryClient.invalidateQueries({ queryKey: ["/api/students"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        },
        onError: () => {
          toast.error("אירעה שגיאה בהוספת הסטודנט");
        }
      }
    );
  };

  const onSubmitEdit = (data: StudentFormValues) => {
    if (!editStudent) return;
    const payload = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
    };
    updateStudent.mutate(
      { studentId: editStudent.id, data: payload },
      {
        onSuccess: () => {
          toast.success("פרטי הסטודנט עודכנו");
          setEditStudent(null);
          queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        },
        onError: () => {
          toast.error("אירעה שגיאה בעדכון הסטודנט");
        }
      }
    );
  };

  const onConfirmDelete = () => {
    if (!deleteStudentId) return;
    deleteStudent.mutate(
      { studentId: deleteStudentId },
      {
        onSuccess: () => {
          toast.success("הסטודנט נמחק בהצלחה");
          setDeleteStudentId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/students"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        },
        onError: () => {
          toast.error("אירעה שגיאה במחיקת הסטודנט");
          setDeleteStudentId(null);
        }
      }
    );
  };


  const StudentDropdown = ({ student }: { student: Student }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => setEditStudent(student)}
        >
          <Pencil className="h-4 w-4" />
          <span>ערוך פרטים</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          onClick={() => setDeleteStudentId(student.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span>מחק סטודנט</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">סטודנטים</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            מאגר הסטודנטים הגלובלי של המערכת
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          הוסף סטודנט
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-3 sm:p-4 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="חיפוש לפי שם או ת.ז..." 
              className="pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="text-sm text-muted-foreground hidden sm:block sm:ml-2">
              סה"כ: {filteredStudents?.length || 0} סטודנטים
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-background flex-1 sm:flex-none"
                onClick={() => setIsImportOpen(true)}
                data-testid="button-open-student-import"
              >
                <Upload className="h-4 w-4" />
                <span>ייבוא CSV</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setIsImportHelpOpen(true)}
                title="עזרה בייבוא CSV"
                data-testid="button-student-import-help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden md:block relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">ת.ז / מזהה</TableHead>
                <TableHead className="text-right">שם פרטי</TableHead>
                <TableHead className="text-right">שם משפחה</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredStudents && filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm" dir="ltr">
                      {student.externalId}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        to={`/students/${student.id}`}
                        className="hover:underline"
                        data-testid={`link-student-${student.id}`}
                      >
                        {student.firstName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link to={`/students/${student.id}`} className="hover:underline">
                        {student.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {student.email ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span dir="ltr">{student.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StudentDropdown student={student} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-12 w-12 mb-4 opacity-20" />
                      <p>לא נמצאו סטודנטים</p>
                      {searchQuery && <p className="text-sm mt-1">נסה לשנות את מילות החיפוש</p>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : filteredStudents && filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 flex items-start justify-between gap-3"
                data-testid={`mobile-row-student-${student.id}`}
              >
                <Link
                  to={`/students/${student.id}`}
                  className="min-w-0 flex-1 space-y-1 active:bg-muted/40 -m-2 p-2 rounded-md"
                  data-testid={`link-student-mobile-${student.id}`}
                >
                  <div className="font-medium truncate">
                    {student.firstName} {student.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                    {student.externalId}
                  </div>
                  {student.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate" dir="ltr">{student.email}</span>
                    </div>
                  )}
                </Link>
                <StudentDropdown student={student} />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p>לא נמצאו סטודנטים</p>
              {searchQuery && <p className="text-sm mt-1">נסה לשנות את מילות החיפוש</p>}
            </div>
          )}
        </div>
      </div>

      {/* Import Students Dialog */}
      <Dialog
        open={isImportOpen}
        onOpenChange={(open) => {
          setIsImportOpen(open);
          if (!open) resetImportDialog();
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              ייבוא סטודנטים ממודל
            </DialogTitle>
            <DialogDescription>
              בחר קורס יעד והעלה קובץ CSV ממסך המשתתפים של Moodle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>קורס יעד</Label>
              <Select value={selectedImportCourseId} onValueChange={setSelectedImportCourseId}>
                <SelectTrigger data-testid="select-import-course">
                  <SelectValue placeholder={isCoursesLoading ? "טוען קורסים..." : "בחר קורס"} />
                </SelectTrigger>
                <SelectContent>
                  {(courses ?? []).map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      #{course.id} | קוד {course.code} | {course.name} | {course.term} {course.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedImportCourse && (
                <p className="text-xs text-muted-foreground">
                  נבחר: #{selectedImportCourse.id} | קוד {selectedImportCourse.code} | {selectedImportCourse.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="students-csv-import">קובץ CSV</Label>
              <Input
                ref={csvImportInputRef}
                id="students-csv-import"
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFileChange}
                data-testid="input-students-csv-import"
              />
              {importFileName && (
                <p className="text-xs text-muted-foreground">קובץ נבחר: {importFileName}</p>
              )}
            </div>

            {importPreview && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  תצוגה מקדימה
                </div>
                <p className="text-sm text-muted-foreground">
                  מספר שורות בקובץ: {importPreview.rows}
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">עמודות שזוהו:</p>
                  <div className="flex flex-wrap gap-2">
                    {importPreview.headers.map((header) => (
                      <span
                        key={header}
                        className="rounded-full border bg-background px-2 py-1 text-xs"
                      >
                        {header}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              חשוב: בחר את הקורס לפי שם הקורס והשורה המלאה בתפריט, לא לפי מספר הקורס במודל בלבד.
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleImportStudents}
              disabled={importStudents.isPending || !selectedImportCourseId || !importCsvContent}
              className="gap-2"
              data-testid="button-confirm-student-import"
            >
              <Upload className="h-4 w-4" />
              {importStudents.isPending ? "מייבא..." : "ייבא סטודנטים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Help Dialog */}
      <Dialog open={isImportHelpOpen} onOpenChange={setIsImportHelpOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              איך מייבאים סטודנטים ממודל?
            </DialogTitle>
            <DialogDescription>
              הסבר קצר על ייצוא CSV ממודל והייבוא ל־GradeFlow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold">שלבים במודל</h3>
              <ol className="list-decimal pr-5 space-y-1.5 text-muted-foreground">
                <li>פתח את עמוד המשתתפים בקורס במודל.</li>
                <li>בחר את המשתתפים הרלוונטיים.</li>
                <li>בתפריט הפעולות למטה בחר: תסדיר ערכים מופרדים בפסיק (csv).</li>
                <li>שמור את הקובץ במחשב והעלה אותו כאן.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">עמודות שנקראות מהקובץ</h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr><td className="p-2 font-mono">שם פרטי</td><td className="p-2 text-muted-foreground">שם פרטי</td></tr>
                    <tr><td className="p-2 font-mono">שם משפחה</td><td className="p-2 text-muted-foreground">שם משפחה</td></tr>
                    <tr><td className="p-2 font-mono">מספר זיהוי</td><td className="p-2 text-muted-foreground">ת.ז / מזהה סטודנט</td></tr>
                    <tr><td className="p-2 font-mono">דוא&quot;ל</td><td className="p-2 text-muted-foreground">אימייל</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">מה קורה בזמן הייבוא?</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />סטודנטים חדשים נוצרים אוטומטית.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />סטודנטים קיימים לפי מספר זיהוי מתעדכנים ולא נוצרים כפולים.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />הסטודנטים משויכים לקורס שבחרת.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) createForm.reset(); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>הוספת סטודנט חדש</DialogTitle>
            <DialogDescription>
              הכנס את פרטי הסטודנט. לאחר מכן תוכל לשייך אותו לקורסים.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
              <StudentFormFields control={createForm.control} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={createStudent.isPending}>
                  {createStudent.isPending ? "שומר..." : "הוסף סטודנט"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>עריכת פרטי סטודנט</DialogTitle>
            <DialogDescription>
              ערוך את פרטי הסטודנט ולחץ שמור.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4 pt-4">
              <StudentFormFields control={editForm.control} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={updateStudent.isPending}>
                  {updateStudent.isPending ? "שומר..." : "שמור שינויים"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStudentId} onOpenChange={(open) => !open && setDeleteStudentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הסטודנט לצמיתות מכל הקורסים ומכל המטלות. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStudent.isPending}
            >
              {deleteStudent.isPending ? "מוחק..." : "מחק סטודנט"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
