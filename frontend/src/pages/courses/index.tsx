import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  useListCourses, 
  useCreateCourse, 
  useDeleteCourse,
  useArchiveCourse,
  useUnarchiveCourse,
} from "@workspace/api-client-react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  CalendarDays,
  Users,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const courseSchema = z.object({
  code: z.string().min(1, "קוד קורס נדרש"),
  name: z.string().min(1, "שם קורס נדרש"),
  term: z.string().min(1, "סמסטר נדרש"),
  year: z.coerce.number().min(2000, "שנה לא חוקית").max(2100, "שנה לא חוקית"),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteCourseId, setDeleteCourseId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const queryClient = useQueryClient();
  const { data: courses, isLoading } = useListCourses({ includeArchived: true });
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const archiveCourse = useArchiveCourse();
  const unarchiveCourse = useUnarchiveCourse();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: "",
      name: "",
      term: "א",
      year: new Date().getFullYear(),
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/courses"] });

  const filteredCourses = courses?.filter(c => {
    if (!showArchived && c.archived) return false;
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const archivedCount = courses?.filter(c => c.archived).length ?? 0;

  const onSubmitCreate = (data: CourseFormValues) => {
    createCourse.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success("הקורס נוצר בהצלחה");
          setIsCreateOpen(false);
          form.reset();
          invalidate();
        },
        onError: () => {
          toast.error("אירעה שגיאה ביצירת הקורס");
        }
      }
    );
  };

  const onConfirmDelete = () => {
    if (!deleteCourseId) return;
    deleteCourse.mutate(
      { courseId: deleteCourseId },
      {
        onSuccess: () => {
          toast.success("הקורס נמחק בהצלחה");
          setDeleteCourseId(null);
          invalidate();
        },
        onError: () => {
          toast.error("אירעה שגיאה במחיקת הקורס");
          setDeleteCourseId(null);
        }
      }
    );
  };

  const onArchive = (courseId: number) => {
    archiveCourse.mutate(
      { courseId },
      {
        onSuccess: () => {
          toast.success("הקורס הועבר לארכיון");
          invalidate();
        },
        onError: () => toast.error("אירעה שגיאה בארכוב הקורס"),
      }
    );
  };

  const onUnarchive = (courseId: number) => {
    unarchiveCourse.mutate(
      { courseId },
      {
        onSuccess: () => {
          toast.success("הקורס שוחזר מהארכיון");
          invalidate();
        },
        onError: () => toast.error("אירעה שגיאה בשחזור הקורס"),
      }
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">קורסים</h1>
          <p className="text-muted-foreground mt-1">
            ניהול כל הקורסים שבאחריותך
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          קורס חדש
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="חיפוש לפי שם או קוד קורס..." 
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {archivedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                הסתר ארכיון ({archivedCount})
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                הצג ארכיון ({archivedCount})
              </>
            )}
          </Button>
        )}
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
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCourses && filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, i) => {
            const colors = courseColor(course.code, isDark);
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card
                  className={`h-full flex flex-col transition-all group border-border/60 ${
                    course.archived
                      ? "opacity-60 hover:opacity-80 bg-muted/30"
                      : "hover:shadow-md"
                  }`}
                  style={{ borderRightColor: colors.stripe, borderRightWidth: "3px" }}
                >
                  <CardHeader
                    className="pb-3 flex flex-row items-start justify-between space-y-0"
                    style={{ background: colors.headerBg }}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/courses/${course.id}`} className="hover:underline">
                          <h3 className="font-semibold text-lg leading-tight truncate" title={course.name}>
                            {course.name}
                          </h3>
                        </Link>
                        {course.archived && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0 bg-muted text-muted-foreground border border-border/60">
                            <Archive className="h-3 w-3" />
                            ארכיון
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center" dir="ltr">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-mono ml-auto"
                          style={{
                            background: colors.badgeBg,
                            color: colors.badgeText,
                            border: `1px solid ${colors.badgeBorder}`,
                          }}
                        >
                          {course.code}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 -mr-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/courses/${course.id}`}>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <BookOpen className="h-4 w-4" />
                            <span>צפה בקורס</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        {course.archived ? (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => onUnarchive(course.id)}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            <span>שחזר מהארכיון</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => onArchive(course.id)}
                          >
                            <Archive className="h-4 w-4" />
                            <span>העבר לארכיון</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          onClick={() => setDeleteCourseId(course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>מחק קורס</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1">
                    <div className="flex gap-3">
                      <Badge variant="secondary" className="font-normal gap-1.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary">
                        <CalendarDays className="h-3 w-3" />
                        סמסטר {course.term} תשפ"{course.year % 100}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex gap-4 text-sm text-muted-foreground border-t border-border/40 mt-4 p-4 bg-muted/20">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{course.studentCount || 0} סטודנטים</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.assignmentCount || 0} מטלות</span>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">לא נמצאו קורסים</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {searchQuery 
              ? "לא נמצאו קורסים התואמים את מילות החיפוש שלך." 
              : "עדיין לא יצרת קורסים במערכת. צור את הקורס הראשון שלך כדי להתחיל."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateOpen(true)} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              צור קורס חדש
            </Button>
          )}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>יצירת קורס חדש</DialogTitle>
            <DialogDescription>
              הכנס את פרטי הקורס. תוכל לערוך אותם מאוחר יותר.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם הקורס</FormLabel>
                    <FormControl>
                      <Input placeholder="לדוגמה: מבוא למדעי המחשב" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>קוד קורס</FormLabel>
                    <FormControl>
                      <Input placeholder="לדוגמה: CS101" {...field} dir="ltr" className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>סמסטר</FormLabel>
                      <FormControl>
                        <Input placeholder="א/ב/קיץ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שנה</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                <Button type="submit" disabled={createCourse.isPending}>
                  {createCourse.isPending ? "יוצר..." : "צור קורס"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCourseId} onOpenChange={(open) => !open && setDeleteCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקורס לצמיתות, כולל כל הסטודנטים הרשומים, המטלות והציונים המשויכים אליו. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCourse.isPending}
            >
              {deleteCourse.isPending ? "מוחק..." : "מחק קורס"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
