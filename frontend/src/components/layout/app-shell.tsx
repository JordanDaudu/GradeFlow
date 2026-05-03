import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { 
  BookOpen, 
  Users, 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  UserCog,
  Menu,
} from "lucide-react";
const jdLogoLight = "/jd-logo-light.png";
const jdLogoDark = "/jd-logo-dark.png";
import { useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/use-theme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

function SidebarNav({
  navItems,
  location,
  onNavigate,
}: {
  navItems: NavItem[];
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href ||
          (item.href !== "/" && location.startsWith(item.href));

        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 px-3 transition-colors ${
                isActive ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium" : "hover:bg-muted font-normal text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetCurrentUser();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/login");
      }
    });
  };

  const navItems: NavItem[] = [
    { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
    { href: "/courses", label: "קורסים", icon: BookOpen },
    { href: "/students", label: "סטודנטים", icon: Users },
    { href: "/assignments", label: "מטלות", icon: FileText },
    { href: "/templates", label: "תבניות משוב", icon: MessageSquare },
    ...(user?.role === "admin"
      ? [{ href: "/users", label: "משתמשים", icon: UserCog }]
      : []),
  ];

  const userFooter = (
    <div className="p-4 border-t border-sidebar-border">
      <div className="flex items-center gap-3 px-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
          {user?.name?.charAt(0) || "U"}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/settings" className="flex-1" onClick={() => setMobileNavOpen(false)}>
          <Button variant="outline" size="sm" className="w-full gap-2 justify-center text-xs h-8">
            <Settings className="h-3.5 w-3.5" />
            הגדרות
          </Button>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-8 px-0 text-muted-foreground hover:text-foreground h-8"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              aria-label={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-8 px-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8"
              onClick={handleLogout}
              disabled={logout.isPending}
              aria-label="התנתק"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">התנתק</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-l border-sidebar-border bg-sidebar text-sidebar-foreground flex-col transition-all duration-300 z-10">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <img src="/logo-mark.svg" alt="GradeFlow logo" className="h-7 w-7 ml-2" />
          <span className="font-bold text-lg tracking-tight">GradeFlow</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-4 px-2 uppercase tracking-wider">תפריט ראשי</div>
          <SidebarNav navItems={navItems} location={location} />
        </div>

        {userFooter}
        <div className="flex items-center justify-center gap-1.5 py-2 border-t border-sidebar-border/50">
          <span className="text-[10px] text-muted-foreground/50 leading-none">by</span>
          <div className="relative h-3.5">
            <img src={jdLogoLight} alt="JD" className="h-3.5 object-contain opacity-60 dark:opacity-0 transition-opacity duration-300" />
            <img src={jdLogoDark}  alt="JD" className="absolute inset-0 h-3.5 object-contain opacity-0 dark:opacity-60 transition-opacity duration-300" />
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="right"
          className="w-72 p-0 bg-sidebar text-sidebar-foreground flex flex-col gap-0"
          data-testid="sheet-mobile-nav"
        >
          <SheetHeader className="h-16 flex-row items-center px-6 border-b border-sidebar-border space-y-0 text-right">
            <img src="/logo-mark.svg" alt="GradeFlow logo" className="h-7 w-7 ml-2" />
            <SheetTitle className="font-bold text-lg tracking-tight">GradeFlow</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 px-4">
            <div className="text-xs font-medium text-muted-foreground mb-4 px-2 uppercase tracking-wider">תפריט ראשי</div>
            <SidebarNav
              navItems={navItems}
              location={location}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
          {userFooter}
          <div className="flex items-center justify-center gap-1.5 py-2 border-t border-sidebar-border/50">
            <span className="text-[10px] text-muted-foreground/50 leading-none">by</span>
            <div className="relative h-3.5">
              <img src={jdLogoLight} alt="JD" className="h-3.5 object-contain opacity-60 dark:opacity-0 transition-opacity duration-300" />
              <img src={jdLogoDark}  alt="JD" className="absolute inset-0 h-3.5 object-contain opacity-0 dark:opacity-60 transition-opacity duration-300" />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        <OfflineBanner />
        {/* Mobile top bar */}
        <header className="md:hidden h-14 flex-shrink-0 flex items-center justify-between gap-2 px-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileNavOpen(true)}
            aria-label="פתח תפריט"
            data-testid="button-open-mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.svg" alt="GradeFlow logo" className="h-6 w-6 shrink-0" />
            <span className="font-bold text-base tracking-tight truncate">GradeFlow</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
            data-testid="button-mobile-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </Button>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
