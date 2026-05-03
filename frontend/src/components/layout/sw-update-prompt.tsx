import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function SwUpdatePrompt() {
  const {
    needRefresh: [swNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, _registration) {
      // SW registered — no action needed
    },
    onRegisterError(error) {
      console.warn("Service worker registration failed:", error);
    },
  });

  // Dev-only test hook: lets e2e tests trigger the update toast by dispatching
  // a custom event. Vite replaces import.meta.env.DEV with `false` in production
  // builds, so this branch is dead-code-eliminated and never ships to users.
  const [testNeedRefresh, setTestNeedRefresh] = useState(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handler = () => setTestNeedRefresh(true);
    window.addEventListener("__gradeflow_sw_update_available", handler);
    return () => window.removeEventListener("__gradeflow_sw_update_available", handler);
  }, []);

  const needRefresh = swNeedRefresh || testNeedRefresh;

  useEffect(() => {
    if (!needRefresh) return;
    toast.info("עדכון זמין", {
      description: "גרסה חדשה של GradeFlow מוכנה.",
      duration: Infinity,
      action: {
        label: "טען מחדש",
        onClick: () => updateServiceWorker(true),
      },
      onDismiss: () => {
        // User dismissed — they'll get it on next load
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
