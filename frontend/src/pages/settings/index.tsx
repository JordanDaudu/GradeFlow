import { useState } from "react";
import {
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
  useLogout,
  useChangePassword,
  useRevokeSessions,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Shield,
  LogOut,
  KeyRound,
  Loader2,
  Users as UsersIcon,
  ShieldOff,
  Sun,
  Moon,
  Monitor,
  Palette,
} from "lucide-react";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { useTheme, type ThemePreference } from "@/lib/use-theme";
import { InstallAppCard } from "@/components/layout/install-app-card";

const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל מערכת",
  lecturer: "מרצה",
  grader: "מתרגל",
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "סיסמה נוכחית נדרשת"),
    newPassword: z.string().min(8, "הסיסמה החדשה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(1, "נא לאשר את הסיסמה"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "הסיסמאות לא תואמות",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { data: user, isLoading } = useGetCurrentUser();
  const logout = useLogout();
  const changePassword = useChangePassword();
  const revokeSessions = useRevokeSessions();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const { preference: themePreference, setTheme } = useTheme();

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: async () => {
        const currentUserQueryKey = getGetCurrentUserQueryKey();

        await queryClient.cancelQueries({ queryKey: currentUserQueryKey });
        queryClient.removeQueries({ queryKey: currentUserQueryKey });
        queryClient.clear();

        setLocation("/login");
      },
    });
  };

  const handleChangePassword = (data: PasswordFormValues) => {
    changePassword.mutate(
      { data: { currentPassword: data.currentPassword, newPassword: data.newPassword } },
      {
        onSuccess: () => {
          toast.success("הסיסמה עודכנה בהצלחה. הפעלות אחרות נותקו.");
          passwordForm.reset();
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } } | null)?.data?.error ||
            "אירעה שגיאה בעדכון הסיסמה";
          toast.error(message);
        },
      },
    );
  };

  const handleRevokeSessions = () => {
    revokeSessions.mutate(undefined, {
      onSuccess: async () => {
        toast.success("כל ההפעלות נותקו. נא להתחבר מחדש.");

        const currentUserQueryKey = getGetCurrentUserQueryKey();

        await queryClient.cancelQueries({ queryKey: currentUserQueryKey });
        queryClient.removeQueries({ queryKey: currentUserQueryKey });
        queryClient.clear();

        setLocation("/login");
      },
      onError: () => {
        toast.error("אירעה שגיאה בניתוק ההפעלות");
      },
    });
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">הגדרות חשבון</h1>
        <p className="text-muted-foreground mt-1">
          ניהול פרטי הפרופיל, סיסמה והפעלות פעילות
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">פרופיל משתמש</CardTitle>
            <CardDescription>הפרטים האישיים שלך כפי שהם מופיעים במערכת</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center shadow-sm">
                <span className="text-4xl font-bold text-primary">
                  {isLoading ? (
                    <Skeleton className="h-10 w-10 rounded-full" />
                  ) : (
                    user?.name?.charAt(0) || "U"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-48" /> : user?.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20"
                  >
                    <Shield className="h-3 w-3 ml-1" />
                    {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  שם מלא
                </div>
                <div className="p-3 bg-muted/30 rounded-md border border-border/50 text-foreground font-medium">
                  {isLoading ? <Skeleton className="h-5 w-full" /> : user?.name}
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  כתובת אימייל
                </div>
                <div
                  className="p-3 bg-muted/30 rounded-md border border-border/50 text-foreground font-medium font-mono"
                  dir="ltr"
                >
                  {isLoading ? <Skeleton className="h-5 w-full" /> : user?.email}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Palette className="h-5 w-5 text-primary" />
              מראה
            </CardTitle>
            <CardDescription>בחר את מצב התצוגה המועדף עליך</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {(
                [
                  { value: "light", label: "בהיר", icon: Sun },
                  { value: "dark", label: "כהה", icon: Moon },
                  { value: "system", label: "לפי המערכת", icon: Monitor },
                ] as { value: ThemePreference; label: string; icon: typeof Sun }[]
              ).map(({ value, label, icon: Icon }) => {
                const active = themePreference === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    data-testid={`button-appearance-${value}`}
                    className={`flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <InstallAppCard />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="h-5 w-5 text-primary" />
              שינוי סיסמה
            </CardTitle>
            <CardDescription>
              לאחר שינוי הסיסמה תינתקנה כל ההפעלות האחרות
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(handleChangePassword)}
                className="space-y-4"
                data-testid="form-change-password"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>סיסמה נוכחית</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          dir="ltr"
                          className="text-right max-w-md"
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>סיסמה חדשה</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            dir="ltr"
                            className="text-right"
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>אישור סיסמה</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            dir="ltr"
                            className="text-right"
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="gap-2"
                >
                  {changePassword.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  עדכן סיסמה
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UsersIcon className="h-5 w-5 text-primary" />
                ניהול משתמשים
              </CardTitle>
              <CardDescription>
                הוספה, עריכה ואיפוס סיסמאות של חשבונות אחרים במערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/users">
                <Button variant="outline" className="gap-2" data-testid="link-manage-users">
                  <UsersIcon className="h-4 w-4" />
                  פתח את ניהול המשתמשים
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border-destructive/20 border">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ShieldOff className="h-5 w-5" />
              אזור אישי
            </CardTitle>
            <CardDescription>פעולות מערכת רגישות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setRevokeOpen(true)}
                data-testid="button-revoke-sessions"
              >
                <ShieldOff className="h-4 w-4" />
                נתק את כל ההפעלות
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors gap-2"
                onClick={handleLogout}
                disabled={logout.isPending}
              >
                <LogOut className="h-4 w-4" />
                {logout.isPending ? "מתנתק..." : "התנתק מהמערכת"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              ניתוק כל ההפעלות מבטל את התוקף של כל הקוקיז הפעילים בכל הדפדפנים שלך, כולל הנוכחי.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>לנתק את כל ההפעלות?</AlertDialogTitle>
            <AlertDialogDescription>
              כל ההפעלות שלך — בכל הדפדפנים והמכשירים, כולל זה הנוכחי — יבוטלו מיד.
              תצטרך להתחבר מחדש.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeSessions}
              disabled={revokeSessions.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeSessions.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              נתק את כל ההפעלות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isLoading && (
        <CardFooter className="bg-muted/10 border-t border-border px-6 py-4 rounded-md text-sm text-muted-foreground">
          {isAdmin
            ? "כמנהל מערכת, יש לך גישה מלאה לניהול חשבונות, איפוס סיסמאות וניהול הפעלות."
            : "כדי לעדכן את שם החשבון או התפקיד, אנא פנה למנהל המערכת."}
        </CardFooter>
      )}
    </div>
  );
}
