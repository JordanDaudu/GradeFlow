import { useState } from "react";
import { Link } from "wouter";
import { 
  useListAssignments, 
  useListCourses, 
  useCreateAssignment, 
  useDeleteAssignment,
  useCloseAssignment,
  useReopenAssignment,
} from "@workspace/api-client-react";
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar,
  MoreVertical,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
  LockOpen,
  Archive,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";

import { useTheme } from "@/lib/use-theme";
import { courseColor } from "@/lib/course-color";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
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

const assignmentSchema = z.object({
  courseId: z.coerce.number().min(1, "יש לבחור קורס"),
  name: z.string().min(1, "שם מטלה נדרש"),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  maxScore: z.coerce.number().min(0, "ציון לא חוקי"),
  weight: z.coerce.number().min(0).max(100, "משקל חייב להיות בין 0 ל-100"),
  gradingScale: z.string().default("numeric"),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<number | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const queryClient = useQueryClient();
  const { data: assignments, isLoading } = useListAssignments();
  const { data: courses } = useListCourses({ includeArchived: true });

  const courseCodeById = Object.fromEntries(
    (courses ?? []).map(c => [c.id, c.code])
  );
  
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const closeAssignment = useCloseAssignment();
  const reopenAssignment = useReopenAssignment();

  const handleClose = (id: number) => {
    closeAssignment.mutate({ assignmentId: id }, {
      onSuccess: () => {
        toast.success("המטלה סגורה");
        queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      },
      onError: () => toast.error("שגיאה בסגירת המטלה"),
    });
  };

  const handleReopen = (id: number) => {
    reopenAssignment.mutate({ assignmentId: id }, {
      onSuccess: () => {
        toast.success("המטלה נפתחה מחדש");
        queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      },
      onError: () => toast.error("שגיאה בפתיחת המטלה"),
    });
  };

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      courseId: 0,
      name: "",
      description: "",
      dueDate: "",
      maxScore: 100,
      weight: 10,
      gradingScale: "numeric",
    },
  });

  const filteredAssignments = assignments?.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (a.courseName && a.courseName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCourse = selectedCourseFilter === "all" || a.courseId.toString() === selectedCourseFilter;
    const matchesClosed = showClosed ? true : !a.closed;
    return matchesSearch && matchesCourse && matchesClosed;
  });

  const closedCount = assignments?.filter(a => a.closed).length ?? 0;

  const onSubmitCreate = (data: AssignmentFormValues) => {
    createAssignment.mutate(
      { data: {
          ...data,
          description: data.description || undefined,
          dueDate: data.dueDate || undefined,
        } 
      },
      {
        onSuccess: () => {
          toast.success("המטלה נוצרה בהצלחה");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
        },
        onError: () => {
          toast.error("אירעה שגיאה ביצירת המטלה");
        }
      }
    );
  };

  const onConfirmDelete = () => {
    if (!deleteAssignmentId) return;
    
    deleteAssignment.mutate(
      { assignmentId: deleteAssignmentId },
      {
        onSuccess: () => {
          toast.success("המטלה נמחקה בהצלחה");
          setDeleteAssignmentId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
        },
        onError: () => {
          toast.error("אירעה שגיאה במחיקת המטלה");
          setDeleteAssignmentId(null);
        }
      }
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">מטלות</h1>
          <p className="text-muted-foreground mt-1">
            ריכוז כל המטלות מכל הקורסים במקום אחד
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          צור מטלה
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="חיפוש לפי שם מטלה או קורס..." 
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="סנן לפי קורס" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקורסים</SelectItem>
              {(() => {
                const active = (courses ?? []).filter(c => !c.archived);
                const archived = (courses ?? []).filter(c => c.archived);
                return (
                  <>
                    {active.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">קורסים פעילים</SelectLabel>
                        {active.map(course => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {archived.length > 0 && (
                      <>
                        {active.length > 0 && <SelectSeparator />}
                        <SelectGroup>
                          <SelectLabel className="text-xs text-muted-foreground">ארכיון</SelectLabel>
                          {archived.map(course => (
                            <SelectItem
                              key={course.id}
                              value={course.id.toString()}
                              className="opacity-60"
                            >
                              <span className="flex items-center gap-1.5">
                                <Archive className="h-3 w-3 shrink-0" />
                                {course.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </>
                );
              })()}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={showClosed ? "secondary" : "outline"}
          size="sm"
          className="gap-2 whitespace-nowrap"
          onClick={() => setShowClosed(v => !v)}
        >
          <Lock className="h-4 w-4" />
          {showClosed ? "הסתר סגורות" : `הצג סגורות${closedCount > 0 ? ` (${closedCount})` : ""}`}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssignments && filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment, i) => {
            const hasDueDate = !!assignment.dueDate;
            const dueDate = hasDueDate ? new Date(assignment.dueDate as string) : null;
            const isPastDue = dueDate ? dueDate < new Date() : false;
            const progress = assignment.submissionCount && assignment.submissionCount > 0 
              ? Math.round(((assignment.gradedCount || 0) / assignment.submissionCount) * 100) 
              : 0;
            const colorKey = courseCodeById[assignment.courseId] ?? assignment.courseName ?? String(assignment.courseId);
            const colors = courseColor(colorKey, isDark);

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card
                  className="h-full flex flex-col hover:shadow-md transition-all group border-border/60"
                  style={{ borderRightColor: colors.stripe, borderRightWidth: "3px" }}
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-start gap-2">
                        <h3 className="font-semibold text-lg leading-tight truncate flex-1 min-w-0" title={assignment.name}>
                          <Link href={`/assignments/${assignment.id}`} className="hover:underline">
                            {assignment.name}
                          </Link>
                        </h3>
                        {assignment.closed && (
                          <Badge variant="secondary" className="gap-1 text-xs shrink-0 mt-0.5">
                            <Lock className="h-3 w-3" />
                            סגורה
                          </Badge>
                        )}
                      </div>
                      {assignment.courseName && (
                        <span
                          className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: colors.badgeBg,
                            color: colors.badgeText,
                            border: `1px solid ${colors.badgeBorder}`,
                          }}
                        >
                          {assignment.courseName}
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/assignments/${assignment.id}`}>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <FileText className="h-4 w-4" />
                            <span>בדיקת מטלה</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        {assignment.closed ? (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => handleReopen(assignment.id)}
                          >
                            <LockOpen className="h-4 w-4" />
                            <span>פתח מחדש</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => handleClose(assignment.id)}
                          >
                            <Lock className="h-4 w-4" />
                            <span>סגור מטלה</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          onClick={() => setDeleteAssignmentId(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>מחק מטלה</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1">
                    <div className="flex flex-col gap-3 mt-2">
                      {hasDueDate && dueDate && (
                        <div className={`flex items-center gap-2 text-sm ${isPastDue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          <Calendar className="h-4 w-4" />
                          <span dir="ltr">{new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(dueDate)}</span>
                        </div>
                      )}
                      
                      <div className="space-y-1 mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>התקדמות בדיקה</span>
                          <span className="font-medium text-foreground">{progress}% ({assignment.gradedCount || 0}/{assignment.submissionCount || 0})</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 ease-in-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex gap-2 border-t border-border/40 mt-4 p-4 bg-muted/10">
                    <Link href={`/assignments/${assignment.id}`} className="w-full">
                      <Button variant="secondary" className="w-full gap-2">
                        <FileText className="h-4 w-4" />
                        המשך בדיקה
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">לא נמצאו מטלות</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {searchQuery || selectedCourseFilter !== "all"
              ? "לא נמצאו מטלות התואמות את החיפוש שלך." 
              : "עדיין לא יצרת מטלות במערכת. צור מטלה חדשה כדי להתחיל לחלק ציונים."}
          </p>
          {!searchQuery && selectedCourseFilter === "all" && (
            <Button onClick={() => setIsCreateOpen(true)} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              צור מטלה חדשה
            </Button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>יצירת מטלה חדשה</DialogTitle>
            <DialogDescription>
              מלא את פרטי המטלה. לאחר היצירה תוכל להוסיף מחוון ולנהל הגשות.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>קורס</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר קורס לשיוך המטלה" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses?.filter(c => !c.archived).map(course => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם המטלה</FormLabel>
                    <FormControl>
                      <Input placeholder="לדוגמה: תרגיל בית 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תיאור (אופציונלי)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="הנחיות או תיאור של המטלה..." className="resize-none h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תאריך הגשה (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} dir="ltr" className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ציון מקסימלי</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>משקל מהציון הסופי (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={createAssignment.isPending}>
                  {createAssignment.isPending ? "יוצר..." : "צור מטלה"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המטלה לצמיתות, כולל כל ההגשות, הציונים והמחוון המשויכים אליה. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAssignment.isPending}
            >
              {deleteAssignment.isPending ? "מוחק..." : "מחק מטלה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
