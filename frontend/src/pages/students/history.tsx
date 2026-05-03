import { Link, useParams, useLocation } from "wouter";
import { useGetStudentHistory } from "@workspace/api-client-react";
import {
  ArrowRight,
  ChevronLeft,
  FileText,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  in_progress: "בבדיקה",
  needs_review: "טעון בדיקה נוספת",
  graded: "נבדק",
  returned: "הוחזר",
  missing: "לא הוגש",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  needs_review: "secondary",
  graded: "default",
  returned: "default",
  missing: "destructive",
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function StudentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useGetStudentHistory(studentId);

  if (!Number.isFinite(studentId) || studentId <= 0) {
    setLocation("/students");
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-medium">תלמיד לא נמצא</h3>
          <Button variant="link" asChild className="mt-2">
            <Link to="/students">חזרה לרשימת הסטודנטים</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { student, items, summary } = data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="page-student-history">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/students" className="hover:text-foreground flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          סטודנטים
        </Link>
        <ChevronLeft className="h-3 w-3" />
        <span className="text-foreground font-medium">{student.firstName} {student.lastName}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            {student.firstName} {student.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground" dir="ltr">
            <span className="font-mono">{student.externalId}</span>
            {student.email && (
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {student.email}</span>
            )}
            {student.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {student.phone}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="stat-total-submissions">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> סך הגשות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalSubmissions}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-graded-count">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> נבדקו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.gradedCount}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-average-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> ציון ממוצע
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.averageScore !== null && summary.averageScore !== undefined
                ? summary.averageScore.toFixed(1)
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">היסטוריית הגשות וציונים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>קורס</TableHead>
                <TableHead>מטלה</TableHead>
                <TableHead>תאריך הגשה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>ציון</TableHead>
                <TableHead>דגלים</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    לסטודנט זה עדיין אין הגשות
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id} data-testid={`row-history-${row.id}`}>
                    <TableCell>
                      <Link to={`/courses/${row.course.id}`} className="hover:underline">
                        <div className="font-medium">{row.course.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{row.course.code}</div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/assignments/${row.assignment.id}`} className="hover:underline font-medium">
                        {row.assignment.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {row.score !== null && row.score !== undefined ? (
                        <span>
                          {Number(row.score).toFixed(1)}
                          <span className="text-muted-foreground">/{row.assignment.maxScore}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {row.originalityFlag && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            מקוריות
                          </Badge>
                        )}
                        {row.submittedLate && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            איחור
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/assignments/${row.assignment.id}/grade/${row.id}`}>
                          פתיחה
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
