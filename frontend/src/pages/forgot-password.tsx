import { useState } from "react";
import { Link } from "wouter";
import { useRequestPasswordReset } from "@workspace/api-client-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, MailCheck } from "lucide-react";
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

const schema = z.object({
  email: z.string().email("כתובת אימייל לא חוקית"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  useTheme();
  const requestReset = useRequestPasswordReset();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: FormValues) => {
    requestReset.mutate(
      { data },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: () => {
          toast.error("אירעה שגיאה. נסה שוב מאוחר יותר.");
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
            <CardTitle className="text-2xl text-center">שכחתי את הסיסמה</CardTitle>
            <CardDescription className="text-center">
              {submitted
                ? "אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס סיסמה"
                : "הזן את כתובת האימייל שלך ונשלח אליך קישור לאיפוס הסיסמה"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>אימייל</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@example.com"
                            type="email"
                            {...field}
                            dir="ltr"
                            className="text-right"
                            data-testid="input-forgot-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full mt-6 h-11"
                    disabled={requestReset.isPending}
                    data-testid="button-forgot-submit"
                  >
                    {requestReset.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        שולח...
                      </>
                    ) : (
                      "שלח קישור לאיפוס"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4" data-testid="forgot-success">
                <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700/40 p-4 flex gap-3">
                  <MailCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300 mt-0.5 shrink-0" />
                  <div className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed space-y-2">
                    <p>
                      בדוק את תיבת הדוא"ל שלך לקבלת הוראות. הקישור תקף לשעה
                      אחת ויפסיק לפעול לאחר שימוש ראשון.
                    </p>
                    <p className="text-xs opacity-80">
                      לא קיבלת מייל? פנה למנהל המערכת — הוא יכול להנפיק לך סיסמה
                      זמנית ישירות.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSubmitted(false);
                    form.reset();
                  }}
                >
                  שלח לכתובת אחרת
                </Button>
              </div>
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
