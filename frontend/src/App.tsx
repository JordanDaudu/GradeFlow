import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/lib/use-theme";
import { SwUpdatePrompt } from "@/components/layout/sw-update-prompt";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";

// Pages
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import DashboardPage from "@/pages/dashboard";
import CoursesPage from "@/pages/courses";
import CourseDetailPage from "@/pages/courses/detail";
import StudentsPage from "@/pages/students";
import StudentHistoryPage from "@/pages/students/history";
import AssignmentsPage from "@/pages/assignments";
import AssignmentDetailPage from "@/pages/assignments/detail";
import GradingPage from "@/pages/grading";
import TemplatesPage from "@/pages/templates";
import SettingsPage from "@/pages/settings";
import UsersPage from "@/pages/users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLIC_ROUTES = new Set(["/login", "/forgot-password", "/reset-password"]);

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading, isError } = useGetCurrentUser();

  const isPublicRoute = PUBLIC_ROUTES.has(location);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAuthed = !isError && !!user;

  if (!isAuthed && !isPublicRoute) {
    return <Redirect to="/login" />;
  }
  if (isAuthed && location === "/login") {
    return <Redirect to="/" />;
  }

  if (location === "/login") {
    return <LoginPage />;
  }
  if (location === "/forgot-password") {
    return <ForgotPasswordPage />;
  }
  if (location === "/reset-password") {
    return <ResetPasswordPage />;
  }

  return <AppShell>{children}</AppShell>;
}

function Router() {
  return (
    <AuthWrapper>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/courses" component={CoursesPage} />
        <Route path="/courses/:id" component={CourseDetailPage} />
        <Route path="/students" component={StudentsPage} />
        <Route path="/students/:id" component={StudentHistoryPage} />
        <Route path="/assignments" component={AssignmentsPage} />
        <Route path="/assignments/:id" component={AssignmentDetailPage} />
        <Route path="/assignments/:id/grade/:submissionId" component={GradingPage} />
        <Route path="/templates" component={TemplatesPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/users" component={UsersPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthWrapper>
  );
}

/**
 * DEV-only crash trigger for the ErrorBoundary e2e test.
 * Throws when ?__e2e_crash=1 is present in the URL — never ships to production
 * because import.meta.env.DEV is statically replaced with `false` at build time.
 */
function TestCrashTrigger() {
  if (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("__e2e_crash")
  ) {
    throw new Error("E2E test crash — ErrorBoundary should catch this");
  }
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <SwUpdatePrompt />
            <TestCrashTrigger />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster position="top-center" richColors dir="rtl" />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
