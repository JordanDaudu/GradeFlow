import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  ArrowLeft,
  PartyPopper,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  useGetDashboardSummary as useGetDashboardStats,
  useGetRecentSubmissions as useGetDashboardRecent,
  useGetCurrentUser,
} from "@workspace/api-client-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PENDING_STATUSES = new Set(["pending", "in_progress", "needs_review"]);

function formatHebrewDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
  }).format(d);
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  tone,
  isLoading,
  index,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone: "primary" | "accent" | "amber" | "destructive";
  isLoading: boolean;
  index: number;
}) {
  const toneStyles: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    accent: { bg: "bg-accent/15", text: "text-accent" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
    destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  };
  const styles = toneStyles[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <Link href={href}>
        <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {title}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold tabular-nums">{value}</p>
                )}
              </div>
              <div
                className={`w-11 h-11 rounded-xl ${styles.bg} flex items-center justify-center shrink-0`}
              >
                <Icon className={`h-5 w-5 ${styles.text}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: user } = useGetCurrentUser();
  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: isRecentLoading } = useGetDashboardRecent();

  const firstName = user?.name?.split(" ")[0] ?? "";

  const nextToGrade = useMemo(() => {
    if (!recent) return null;
    // Walk from oldest pending → so the queue is processed in order.
    const pending = recent.filter((r) => PENDING_STATUSES.has(r.status));
    if (pending.length === 0) return null;
    return pending[pending.length - 1];
  }, [recent]);

  const pendingCount = stats?.pendingGrading ?? 0;
  const breakdown = stats?.statusBreakdown;
  const totalForBar = breakdown
    ? (breakdown.pending ?? 0) +
      (breakdown.in_progress ?? 0) +
      (breakdown.needs_review ?? 0) +
      (breakdown.graded ?? 0) +
      (breakdown.returned ?? 0)
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {firstName ? `שלום, ${firstName}` : "ברוכים הבאים ל-GradeFlow"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            כאן אפשר לראות מה מחכה לבדיקה היום ולהמשיך מאיפה שעצרת.
          </p>
        </div>
      </div>

      {/* Hero "Continue grading" CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        data-testid="dashboard-next-to-grade"
      >
        {isRecentLoading || isStatsLoading ? (
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-72" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        ) : nextToGrade ? (
          <Card
            className="overflow-hidden border-primary/30 bg-gradient-to-l from-primary/5 via-transparent to-transparent"
          >
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">
                    הבא בתור לבדיקה
                  </p>
                  <h2 className="text-lg md:text-xl font-semibold truncate">
                    {nextToGrade.studentName}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {nextToGrade.assignmentName} · {nextToGrade.courseName}
                  </p>
                </div>
                <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
                  <Link
                    href={`/assignments/${nextToGrade.assignmentId}/grade/${nextToGrade.id}`}
                  >
                    <Button
                      size="lg"
                      className="w-full md:w-auto gap-2"
                      data-testid="button-continue-grading"
                    >
                      המשך לבדוק
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  {pendingCount > 1 && (
                    <span className="text-xs text-muted-foreground text-center md:text-end">
                      עוד {pendingCount - 1} הגשות בתור
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/60 bg-muted/20">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-right">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <PartyPopper className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-semibold">
                  כל הכבוד! אין הגשות שמחכות לבדיקה.
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  כשיגיעו הגשות חדשות הן יופיעו כאן.
                </p>
              </div>
              <Link href="/assignments">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  עבור למטלות
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          title="קורסים פעילים"
          value={stats?.activeCourses ?? stats?.totalCourses ?? 0}
          icon={BookOpen}
          href="/courses"
          tone="primary"
          isLoading={isStatsLoading}
          index={0}
        />
        <StatCard
          title="סטודנטים"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          href="/students"
          tone="accent"
          isLoading={isStatsLoading}
          index={1}
        />
        <StatCard
          title="מטלות פתוחות"
          value={stats?.totalAssignments ?? 0}
          icon={FileText}
          href="/assignments"
          tone="amber"
          isLoading={isStatsLoading}
          index={2}
        />
        <StatCard
          title="ממתין לבדיקה"
          value={pendingCount}
          icon={Clock}
          href="/assignments"
          tone="destructive"
          isLoading={isStatsLoading}
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">הגשות אחרונות</CardTitle>
              <CardDescription>פעילות מהזמן האחרון במערכת</CardDescription>
            </div>
            <Link href="/assignments">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                צפה בהכל
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {isRecentLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[60%]" />
                      <Skeleton className="h-3 w-[40%]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recent && recent.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {recent.slice(0, 6).map((sub, i) => {
                  const isPending = PENDING_STATUSES.has(sub.status);
                  const href = `/assignments/${sub.assignmentId}/grade/${sub.id}`;
                  return (
                    <motion.li
                      key={sub.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link href={href}>
                        <div
                          className="flex items-start gap-3 py-3 -mx-2 px-2 rounded-md hover:bg-muted/40 transition-colors group cursor-pointer"
                          data-testid={`recent-submission-${sub.id}`}
                        >
                          <div
                            className={`mt-0.5 p-2 rounded-full shrink-0 ${
                              isPending
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isPending ? (
                              <Clock className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">
                                {sub.studentName}
                              </p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatHebrewDate(sub.updatedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground truncate">
                                {sub.assignmentName} · {sub.courseName}
                              </p>
                              {!isPending && sub.score !== null && sub.score !== undefined && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 px-1.5 font-medium bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900/40 shrink-0"
                                >
                                  ציון: {sub.score}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium">אין הגשות כרגע</h3>
                <p className="text-muted-foreground text-sm max-w-xs mt-1">
                  הגשות סטודנטים יופיעו כאן לאחר שיועלו למערכת.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown widget */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">פילוח לפי סטטוס</CardTitle>
            <CardDescription>חלוקת ההגשות במערכת</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {isStatsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                {/* Stacked progress bar */}
                {totalForBar > 0 && breakdown && (
                  <div className="mb-5">
                    <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted">
                      {(breakdown.graded ?? 0) > 0 && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${((breakdown.graded ?? 0) / totalForBar) * 100}%`,
                          }}
                          title={`נבדקו: ${breakdown.graded}`}
                        />
                      )}
                      {(breakdown.returned ?? 0) > 0 && (
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${((breakdown.returned ?? 0) / totalForBar) * 100}%`,
                          }}
                          title={`הוחזר: ${breakdown.returned}`}
                        />
                      )}
                      {(breakdown.in_progress ?? 0) > 0 && (
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${((breakdown.in_progress ?? 0) / totalForBar) * 100}%`,
                          }}
                          title={`בתהליך: ${breakdown.in_progress}`}
                        />
                      )}
                      {(breakdown.needs_review ?? 0) > 0 && (
                        <div
                          className="h-full bg-orange-500"
                          style={{
                            width: `${((breakdown.needs_review ?? 0) / totalForBar) * 100}%`,
                          }}
                          title={`דורש בדיקה חוזרת: ${breakdown.needs_review}`}
                        />
                      )}
                      {(breakdown.pending ?? 0) > 0 && (
                        <div
                          className="h-full bg-amber-500"
                          style={{
                            width: `${((breakdown.pending ?? 0) / totalForBar) * 100}%`,
                          }}
                          title={`ממתין: ${breakdown.pending}`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Per-status counts */}
                <ul className="space-y-2.5 text-sm">
                  <BreakdownRow
                    color="bg-amber-500"
                    label="ממתין לבדיקה"
                    value={breakdown?.pending ?? 0}
                  />
                  <BreakdownRow
                    color="bg-amber-400"
                    label="בתהליך"
                    value={breakdown?.in_progress ?? 0}
                  />
                  <BreakdownRow
                    color="bg-orange-500"
                    label="דורש בדיקה חוזרת"
                    value={breakdown?.needs_review ?? 0}
                  />
                  <BreakdownRow
                    color="bg-emerald-500"
                    label="נבדק"
                    value={breakdown?.graded ?? 0}
                  />
                  <BreakdownRow
                    color="bg-blue-500"
                    label="הוחזר לתיקון"
                    value={breakdown?.returned ?? 0}
                  />
                </ul>

                {/* This-week footer */}
                <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      נבדקו השבוע
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      {stats?.gradedThisWeek ?? 0}
                    </span>
                  </div>
                  {(stats?.lateSubmissions ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                        הגשות באיחור
                      </span>
                      <span className="text-base font-bold tabular-nums text-orange-600 dark:text-orange-400">
                        {stats?.lateSubmissions}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BreakdownRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}
