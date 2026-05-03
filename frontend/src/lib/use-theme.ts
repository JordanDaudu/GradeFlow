import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  createElement,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const STORAGE_KEY = "gradeflow-theme";

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage may be unavailable (e.g. private mode)
  }
  return "system";
}

function resolvePreference(pref: ThemePreference): Theme {
  if (typeof window === "undefined") return "light";
  if (pref === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setTheme: (next: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const pref = getStoredPreference();
    applyTheme(resolvePreference(pref));
    return pref;
  });

  const [resolvedTheme, setResolvedTheme] = useState<Theme>(() =>
    resolvePreference(getStoredPreference())
  );

  useEffect(() => {
    const resolved = resolvePreference(preference);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // ignore storage errors
    }
  }, [preference]);

  // React to OS preference changes when using "system" mode.
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = resolvePreference("system");
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  // Cycles explicit light ↔ dark, bypassing "system".
  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => (resolvePreference(prev) === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme: resolvedTheme, preference, setTheme, toggleTheme }),
    [resolvedTheme, preference, setTheme, toggleTheme]
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
