import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sun, Moon } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTheme } from "@/lib/use-theme";
import jdLogoLight from "@assets/JD_logo_1777797796775.png";
import jdLogoDark from "@assets/JD_logo_Dark_Mode_1777797796774.png";

const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא חוקית"),
  password: z.string().min(1, "סיסמה נדרשת"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: async (user) => {
          queryClient.setQueryData(getGetCurrentUserQueryKey(), user);
          await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast.success("התחברת בהצלחה");
          setLocation("/");
        },
        onError: (error: unknown) => {
          const message =
            (error as { data?: { error?: string } } | null)?.data?.error ||
            "אירעה שגיאה בהתחברות";
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30" dir="rtl">
      <div className="flex-1 flex items-center justify-center p-4">
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
            <p className="text-muted-foreground mt-2">סביבת עבודה חכמה לבדיקת מטלות</p>
          </div>

          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center">התחברות למערכת</CardTitle>
              <CardDescription className="text-center">
                הזן את פרטי הגישה שלך כדי להמשיך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>אימייל</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@gradeflow.app" type="email" {...field} dir="ltr" className="text-right" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>סיסמה</FormLabel>
                        <FormControl>
                          <Input placeholder="••••••••" type="password" {...field} dir="ltr" className="text-right" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full mt-6 h-11" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        מתחבר...
                      </>
                    ) : (
                      "התחבר"
                    )}
                  </Button>
                  <div className="text-center">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      שכחתי את הסיסמה
                    </Link>
                  </div>
                </form>
              </Form>
              
              <div className="mt-6 text-center text-sm text-muted-foreground border-t border-border pt-4">
                <p>פרטי גישה להדגמה:</p>
                <p className="font-mono mt-1 select-all" dir="ltr">admin@gradeflow.app / admin123</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Page footer */}
      <footer className="flex items-center justify-center gap-3 py-4 px-4 border-t border-border/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/60 hover:text-foreground"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          data-testid="button-login-theme-toggle"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <span className="text-xs text-muted-foreground/50">Made by</span>
        <div className="relative h-5">
          <img src={jdLogoLight} alt="JD" className="h-5 object-contain opacity-60 dark:opacity-0 transition-opacity duration-300" />
          <img src={jdLogoDark}  alt="JD" className="absolute inset-0 h-5 object-contain opacity-0 dark:opacity-60 transition-opacity duration-300" />
        </div>
      </footer>
    </div>
  );
}
