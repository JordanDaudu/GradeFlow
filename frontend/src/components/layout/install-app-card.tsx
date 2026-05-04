import { CheckCircle2, Download, Monitor, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInstallApp } from "@/hooks/use-install-app";

export function InstallAppCard() {
  const { canInstall, isInstalled, isIos, installApp } = useInstallApp();

  const handleInstall = async () => {
    const installed = await installApp();

    if (installed) {
      toast.success("GradeFlow הותקנה בהצלחה");
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Download className="h-5 w-5 text-primary" />
          התקנת האפליקציה
        </CardTitle>
        <CardDescription>
          ניתן להתקין את GradeFlow כאפליקציה על המחשב או הטלפון, בלי App Store.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          {isInstalled ? (
            <Button disabled className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              האפליקציה כבר מותקנת
            </Button>
          ) : canInstall ? (
            <Button onClick={handleInstall} className="gap-2" data-testid="button-install-app">
              <Download className="h-4 w-4" />
              התקן את GradeFlow
            </Button>
          ) : (
            <Button variant="outline" disabled className="gap-2">
              <Download className="h-4 w-4" />
              ההתקנה זמינה מתפריט הדפדפן
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            {isIos
              ? "ב־iPhone ו־iPad מתקינים דרך Safari ותפריט השיתוף."
              : "אם הכפתור לא פעיל, השתמש באפשרות ההתקנה של הדפדפן."}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <Monitor className="h-4 w-4 text-primary" />
              מחשב
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              ב־Chrome או Edge לחץ על אייקון ההתקנה בשורת הכתובת.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Android
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              פתח ב־Chrome → תפריט שלוש נקודות → Add to Home screen.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <Share2 className="h-4 w-4 text-primary" />
              iPhone / iPad
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              פתח ב־Safari → Share → Add to Home Screen.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
