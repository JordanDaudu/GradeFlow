import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useResetPassword } from "@workspace/api-client-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useTheme } from "@/lib/use-theme";

const schema = z
  .object({
    newPassword: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(1, "נא לאשר את הסיסמה"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "הסיסמאות לא תואמות",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  useTheme();
  const [, setLocation] = useLocation();
  const resetPassword = useResetPassword();

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = (data: FormValues) => {
    if (!token) return;
    resetPassword.mutate(
      { data: { token, newPassword: data.newPassword } },
      {
        onSuccess: () => {
          toast.success("הסיסמה אופסה בהצלחה. כעת ניתן להתחבר.");
          setLocation("/login");
        },
        onError: (error: unknown) => {
          const message =
            (error as { data?: { error?: string } } | null)?.data?.error ||
            "הקישור לאיפוס הסיסמה אינו תקף או פג תוקפו";
          toast.error(message);
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <img src="/logo-mark.svg" alt="GradeFlow logo" className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">GradeFlow</h1>
          <p className="text-muted-foreground mt-2">איפוס סיסמה</p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">בחירת סיסמה חדשה</CardTitle>
            <CardDescription className="text-center">
              {token ? "הזן סיסמה חדשה לחשבונך" : "הקישור אינו תקף"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                <p className="text-sm text-foreground">
                  לא נמצא קוד איפוס בקישור. אנא בקש קישור חדש מדף "שכחתי סיסמה".
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-block text-sm font-medium text-primary hover:underline"
                >
                  בקש קישור חדש
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>סיסמה חדשה</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="••••••••"
                            type="password"
                            {...field}
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
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>אישור סיסמה</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="••••••••"
                            type="password"
                            {...field}
                            dir="ltr"
                            className="text-right"
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full mt-6 h-11"
                    disabled={resetPassword.isPending}
                  >
                    {resetPassword.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        מעדכן...
                      </>
                    ) : (
                      "אפס סיסמה"
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground border-t border-border pt-4">
              <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5" />
                חזרה להתחברות
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
