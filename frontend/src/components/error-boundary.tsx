import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen w-full flex items-center justify-center bg-background"
          dir="rtl"
        >
          <div className="flex flex-col items-center text-center px-6 max-w-sm">
            <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-3">
              אירעה שגיאה בלתי צפויה
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              משהו השתבש בהצגת הדף. ניתן לנסות לרענן, או לחזור לדף הבית.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={this.handleReset}
              >
                <RefreshCw className="h-4 w-4" />
                נסה שוב
              </Button>
              <Button
                className="gap-2"
                onClick={() => {
                  this.handleReset();
                  window.location.href = "/";
                }}
              >
                <Home className="h-4 w-4" />
                דף הבית
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-8 w-full text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                  פרטי שגיאה (מצב פיתוח)
                </summary>
                <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-auto max-h-48 text-destructive whitespace-pre-wrap break-all">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
