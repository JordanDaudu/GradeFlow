import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetCourse,
  useListCourseStudents,
  useListAssignments,
  useEnrollStudent,
  useUnenrollStudent,
  useListStudents,
  useImportStudents,
  useUpdateCourse,
  exportGradebookCsv,
} from "@workspace/api-client-react";
import { 
  BookOpen, 
  Users, 
  FileText, 
  Search, 
  Plus, 
  Trash2,
  Calendar,
  ChevronRight,
  Upload,
  Download,
  Pencil,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function CourseDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const courseId = parseInt(params.id || "0", 10);
  
  const [activeTab, setActiveTab] = useState("students");
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", code: "", term: "", year: "" });
  const [isCsvHelpOpen, setIsCsvHelpOpen] = useState(false);
  const [csvExampleCopied, setCsvExampleCopied] = useState(false);

  const queryClient = useQueryClient();
  
  const { data: course, isLoading: isCourseLoading } = useGetCourse(courseId);
  const { data: enrolledStudents, isLoading: isStudentsLoading } = useListCourseStudents(courseId);
  const { data: assignments, isLoading: isAssignmentsLoading } = useListAssignments({ courseId });
  const { data: allStudents } = useListStudents();
  
  const enrollStudent = useEnrollStudent();
  const unenrollStudent = useUnenrollStudent();
  const importStudents = useImportStudents();
  const updateCourse = useUpdateCourse();

  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleExportGradebook = async () => {
    try {
      const csv = await exportGradebookCsv(courseId);
      const slug = (course?.code ?? `course-${courseId}`).replace(/\s+/g, "_");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_gradebook.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("הציונים יוצאו בהצלחה");
    } catch {
      toast.error("יצוא נכשל");
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const csv = await file.text();
      const result = await importStudents.mutateAsync({ data: { csv, courseId } });
      toast.success(
        `יובאו ${result.created} סטודנטים חדשים, עודכנו ${result.updated}, נרשמו ${result.enrolled} לקורס`,
      );
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/students`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students`] });
    } catch {
      toast.error("יבוא ה-CSV נכשל");
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  if (!courseId) {
    setLocation("/courses");
    return null;
  }

  const openEditDialog = () => {
    if (!course) return;
    setEditForm({
      name: course.name,
      code: course.code,
      term: course.term,
      year: String(course.year),
    });
    setIsEditOpen(true);
  };

  const handleSaveCourse = () => {
    const year = parseInt(editForm.year, 10);
    if (!editForm.name.trim() || !editForm.code.trim() || !editForm.term.trim() || isNaN(year)) {
      toast.error("יש למלא את כל השדות");
      return;
    }
    updateCourse.mutate(
      { courseId, data: { name: editForm.name.trim(), code: editForm.code.trim(), term: editForm.term.trim(), year } },
      {
        onSuccess: () => {
          toast.success("פרטי הקורס עודכנו בהצלחה");
          queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
          setIsEditOpen(false);
        },
        onError: () => toast.error("אירעה שגיאה בעדכון הקורס"),
      }
    );
  };

  const handleEnroll = (studentId: number) => {
    enrollStudent.mutate(
      { courseId, data: { studentId } },
      {
        onSuccess: () => {
          toast.success("הסטודנט נרשם לקורס בהצלחה");
          queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/students`] });
          setIsEnrollDialogOpen(false);
        },
        onError: () => toast.error("אירעה שגיאה ברישום הסטודנט")
      }
    );
  };

  const handleUnenroll = (studentId: number) => {
    unenrollStudent.mutate(
      { courseId, studentId },
      {
        onSuccess: () => {
          toast.success("הרישום בוטל בהצלחה");
          queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/students`] });
        },
        onError: () => toast.error("אירעה שגיאה בביטול הרישום")
      }
    );
  };

  // Filter students not already enrolled
  const enrolledIds = new Set(enrolledStudents?.map(s => s.id) || []);
  const availableStudents = allStudents?.filter(s => !enrolledIds.has(s.id)) || [];
  
  const filteredAvailableStudents = availableStudents.filter(s => 
    !studentSearch || 
    s.firstName.includes(studentSearch) || 
    s.lastName.includes(studentSearch) || 
    s.externalId.includes(studentSearch)
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground flex-wrap">
          <button onClick={() => setLocation("/courses")} className="hover:text-foreground transition-colors">
            קורסים
          </button>
          <ChevronRight className="h-4 w-4 mx-2 rtl:rotate-180" />
          <span className="text-foreground font-medium truncate max-w-[60vw]">
            {isCourseLoading ? <Skeleton className="h-4 w-24 inline-block" /> : course?.name}
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
          <div className="min-w-0 w-full">
            {isCourseLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-card-foreground break-words">
                  {course?.name} <span className="text-muted-foreground font-normal ml-2">({course?.code})</span>
                </h1>
                <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-3 text-muted-foreground text-sm">
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                    <Calendar className="h-4 w-4" />
                    <span>סמסטר {course?.term} תשפ"{course?.year ? course.year % 100 : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                    <Users className="h-4 w-4" />
                    <span>{enrolledStudents?.length || 0} רשומים</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background"
              onClick={openEditDialog}
              disabled={isCourseLoading}
              data-testid="button-edit-course"
            >
              <Pencil className="h-4 w-4" />
              עריכת פרטים
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background w-full sm:w-auto"
              onClick={handleExportGradebook}
              data-testid="button-export-gradebook"
            >
              <Download className="h-4 w-4" />
              יצוא ציונים
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            סטודנטים רשומים
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <FileText className="h-4 w-4" />
            מטלות
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 border border-border rounded-xl bg-card shadow-sm overflow-hidden min-h-[400px]">
          {/* Students Tab */}
          <TabsContent value="students" className="m-0 border-none outline-none">
            <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-muted/20">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="חיפוש סטודנט רשום..." className="pr-10 bg-background" />
              </div>
              
              <div className="flex gap-2 self-stretch sm:self-auto">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportCsv}
                  data-testid="input-csv-import"
                />
                <div className="flex gap-1 flex-1 sm:flex-none">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-background flex-1 sm:flex-none"
                    onClick={() => csvInputRef.current?.click()}
                    disabled={importStudents.isPending}
                    data-testid="button-import-csv"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="truncate">{importStudents.isPending ? "מייבא..." : "יבוא CSV"}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => setIsCsvHelpOpen(true)}
                    title="עזרה בפורמט CSV"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 flex-1 sm:flex-none">
                      <Plus className="h-4 w-4" />
                      <span className="truncate">רישום סטודנט</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>רישום סטודנט לקורס</DialogTitle>
                      <DialogDescription>
                        חפש ובחר סטודנט מתוך מאגר הסטודנטים הגלובלי.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="mt-4 border rounded-md">
                      <Command>
                        <CommandInput 
                          placeholder="חיפוש לפי שם או ת.ז..." 
                          value={studentSearch}
                          onValueChange={setStudentSearch}
                        />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>לא נמצאו סטודנטים מתאימים.</CommandEmpty>
                          <CommandGroup>
                            {filteredAvailableStudents.map(student => (
                              <CommandItem 
                                key={student.id} 
                                onSelect={() => handleEnroll(student.id)}
                                className="flex justify-between items-center cursor-pointer py-3"
                              >
                                <div>
                                  <p className="font-medium">{student.firstName} {student.lastName}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{student.externalId}</p>
                                </div>
                                <Button size="sm" variant="secondary" className="h-8">
                                  רשום
                                </Button>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* CSV Help Dialog */}
                <Dialog open={isCsvHelpOpen} onOpenChange={setIsCsvHelpOpen}>
                  <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                        יבוא סטודנטים מקובץ CSV
                      </DialogTitle>
                      <DialogDescription>
                        ייבא את רשימת הסטודנטים לקורס בלחיצה אחת — הנה כל מה שצריך לדעת.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 pt-2 text-sm">

                      {/* What it does */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base">מה קורה בייבוא?</h3>
                        <ul className="space-y-1.5 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            סטודנטים חדשים נוצרים ומצורפים אוטומטית לקורס
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            סטודנטים קיימים (לפי ת.ז) מתעדכנים — לא נוצרים כפולים
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            נוצרות הגשות אוטומטיות לכל המטלות בקורס
                          </li>
                        </ul>
                      </div>

                      {/* Required columns */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base">עמודות חובה</h3>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-right p-2.5 font-medium">שם עמודה</th>
                                <th className="text-right p-2.5 font-medium">תיאור</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              <tr>
                                <td className="p-2.5 font-mono text-xs align-top">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">תעודת זהות</span>
                                  <span className="text-muted-foreground mx-1">/</span>
                                  <span className="bg-muted px-1.5 py-0.5 rounded">ת.ז</span>
                                </td>
                                <td className="p-2.5 text-muted-foreground">מזהה ייחודי לסטודנט — חובה</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-xs align-top">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">שם פרטי</span>
                                </td>
                                <td className="p-2.5 text-muted-foreground">
                                  שם פרטי — חובה<br />
                                  <span className="text-xs">ניתן להשתמש ב<span className="font-mono bg-muted px-1 rounded mx-0.5">שם מלא</span>במקום (יפוצל אוטומטית)</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Optional columns */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base">עמודות אופציונליות</h3>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-right p-2.5 font-medium">שם עמודה</th>
                                <th className="text-right p-2.5 font-medium">תיאור</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              <tr>
                                <td className="p-2.5 font-mono text-xs">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">שם משפחה</span>
                                </td>
                                <td className="p-2.5 text-muted-foreground">שם משפחה</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-xs">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">אימייל</span>
                                </td>
                                <td className="p-2.5 text-muted-foreground">כתובת אימייל</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-xs">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">טלפון</span>
                                </td>
                                <td className="p-2.5 text-muted-foreground">מספר טלפון</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-xs">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">הערות</span>
                                </td>
                                <td className="p-2.5 text-muted-foreground">הערות חופשיות</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Example */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-base">דוגמה</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-muted-foreground"
                            onClick={() => {
                              const example = `תעודת זהות,שם פרטי,שם משפחה,אימייל\n123456789,ישראל,ישראלי,israel@university.ac.il\n987654321,שרה,לוי,sara.l@university.ac.il\n555000111,דוד,כהן,`;
                              navigator.clipboard.writeText(example).then(() => {
                                setCsvExampleCopied(true);
                                setTimeout(() => setCsvExampleCopied(false), 2000);
                              });
                            }}
                          >
                            {csvExampleCopied ? (
                              <><Check className="h-3.5 w-3.5 text-green-600" />הועתק!</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5" />העתק דוגמה</>
                            )}
                          </Button>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3 overflow-x-auto">
                          <pre className="text-xs font-mono whitespace-pre text-foreground leading-relaxed" dir="ltr">{`תעודת זהות,שם פרטי,שם משפחה,אימייל
123456789,ישראל,ישראלי,israel@university.ac.il
987654321,שרה,לוי,sara.l@university.ac.il
555000111,דוד,כהן,`}</pre>
                        </div>
                      </div>

                      {/* Tips */}
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3.5 space-y-1.5">
                        <p className="font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          כמה טיפים שיחסכו לך זמן
                        </p>
                        <ul className="space-y-1 text-amber-800 dark:text-amber-300 text-xs list-disc list-inside">
                          <li>ניתן לייצא את הרשימה ישירות מהמנס (Moodle / מערכות אחרות) ולהעלות ישירות</li>
                          <li>הכותרות בשורה הראשונה בלבד — שאר השורות הן הנתונים</li>
                          <li>אפשר לייבא מחדש כדי לעדכן פרטים — לא ייווצרו כפולים</li>
                          <li>קובץ ריק או ללא שורות נתונים יחזיר שגיאה</li>
                        </ul>
                      </div>

                    </div>
                  </DialogContent>
                </Dialog>

              </div>
            </div>
            
            {/* Desktop / tablet table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="text-right w-[150px]">ת.ז / מזהה</TableHead>
                    <TableHead className="text-right">שם פרטי</TableHead>
                    <TableHead className="text-right">שם משפחה</TableHead>
                    <TableHead className="text-right">אימייל</TableHead>
                    <TableHead className="w-[100px] text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isStudentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : enrolledStudents && enrolledStudents.length > 0 ? (
                    enrolledStudents.map((student, i) => (
                      <motion.tr 
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group"
                      >
                        <TableCell className="font-mono text-sm text-muted-foreground" dir="ltr">
                          {student.externalId}
                        </TableCell>
                        <TableCell className="font-medium">{student.firstName}</TableCell>
                        <TableCell className="font-medium">{student.lastName}</TableCell>
                        <TableCell className="text-muted-foreground" dir="ltr">
                          {student.email || "-"}
                        </TableCell>
                        <TableCell className="text-left">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleUnenroll(student.id)}
                            disabled={unenrollStudent.isPending}
                            title="בטל רישום"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Users className="h-12 w-12 mb-4 opacity-20" />
                          <h3 className="text-lg font-medium text-foreground">אין סטודנטים רשומים</h3>
                          <p className="max-w-sm mt-1">רשום סטודנטים ממאגר הסטודנטים או ייבא קובץ קובץ CSV של רשימת הסטודנטים בקורס.</p>
                          <Button variant="outline" className="mt-4" onClick={() => setIsEnrollDialogOpen(true)}>
                            רשום סטודנט ראשון
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {isStudentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : enrolledStudents && enrolledStudents.length > 0 ? (
                enrolledStudents.map((student, i) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 flex items-start justify-between gap-3"
                    data-testid={`mobile-row-enrolled-${student.id}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-medium truncate">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {student.externalId}
                      </div>
                      {student.email && (
                        <div className="text-xs text-muted-foreground truncate" dir="ltr">
                          {student.email}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleUnenroll(student.id)}
                      disabled={unenrollStudent.isPending}
                      title="בטל רישום"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <Users className="h-12 w-12 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-foreground">אין סטודנטים רשומים</h3>
                  <p className="text-sm mt-1 max-w-sm">רשום סטודנטים ממאגר הסטודנטים או ייבא קובץ CSV.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEnrollDialogOpen(true)}>
                    רשום סטודנט ראשון
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="m-0 border-none outline-none">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="font-semibold px-2">מטלות הקורס</h2>
              <Button 
                onClick={() => setLocation("/assignments")} 
                size="sm" 
                className="gap-2 bg-background hover:bg-muted text-foreground"
                variant="outline"
              >
                ניהול מטלות מלא
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
            </div>
            
            <div className="p-6">
              {isAssignmentsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2"><Skeleton className="h-5 w-1/2" /></CardHeader>
                      <CardContent><Skeleton className="h-4 w-1/3" /></CardContent>
                    </Card>
                  ))}
                </div>
              ) : assignments && assignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map((assignment, i) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => setLocation(`/assignments/${assignment.id}`)}>
                        <CardHeader className="pb-2 flex flex-row justify-between items-start">
                          <CardTitle className="text-lg">{assignment.name}</CardTitle>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                            <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Button>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>מקסימום {assignment.maxScore} נקודות</span>
                            <span>•</span>
                            <span>משקל {assignment.weight}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-20" />
                  <p>אין מטלות מקושרות לקורס זה</p>
                  <Button variant="outline" className="mt-4" onClick={() => setLocation("/assignments")}>
                    עבור לניהול מטלות
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Course Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי קורס</DialogTitle>
            <DialogDescription>שנה את פרטי הקורס ולחץ שמור.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">שם הקורס</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="למשל: מבנה נתונים ואלגוריתמים"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">קוד קורס</label>
              <Input
                value={editForm.code}
                onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                placeholder="למשל: CS-101"
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">סמסטר</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editForm.term}
                  onChange={e => setEditForm(f => ({ ...f, term: e.target.value }))}
                >
                  <option value="">בחר סמסטר</option>
                  <option value="אביב">אביב</option>
                  <option value="סתיו">סתיו</option>
                  <option value="קיץ">קיץ</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">שנה</label>
                <Input
                  type="number"
                  value={editForm.year}
                  onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="2025"
                  min={2000}
                  max={2100}
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveCourse} disabled={updateCourse.isPending}>
              {updateCourse.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}