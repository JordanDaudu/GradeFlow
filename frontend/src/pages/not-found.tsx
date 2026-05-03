import { Link } from "wouter";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background"
      dir="rtl"
    >
      <div className="flex flex-col items-center text-center px-6 max-w-sm">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>

        <h1 className="text-5xl font-bold text-foreground mb-3 font-mono" dir="ltr">
          404
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">
          הדף לא נמצא
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          הדף שחיפשת אינו קיים, אולי הכתובת שגויה או שהדף הוסר.
        </p>

        <Button asChild className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            חזרה לדף הבית
          </Link>
        </Button>
      </div>
    </div>
  );
}
