import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  getListUsersQueryKey,
  useGetCurrentUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useAdminResetUserPassword,
  type User,
  type UserRole,
} from "@workspace/api-client-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCog,
  Users as UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "מנהל מערכת",
  lecturer: "מרצה",
  grader: "מתרגל",
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  lecturer: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  grader: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const createSchema = z.object({
  email: z.string().email("כתובת אימייל לא חוקית"),
  name: z.string().min(1, "שם נדרש"),
  role: z.enum(["admin", "lecturer", "grader"]),
  password: z
    .string()
    .min(0)
    .refine((v) => v.length === 0 || v.length >= 8, "סיסמה חייבת להכיל לפחות 8 תווים"),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().min(1, "שם נדרש"),
  role: z.enum(["admin", "lecturer", "grader"]),
});
type EditFormValues = z.infer<typeof editSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const { data: users, isLoading, isError, error } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPasswordMutation = useAdminResetUserPassword();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
    label: string;
  } | null>(null);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", name: "", role: "grader", password: "" },
  });
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", role: "grader" },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleCreate = (data: CreateFormValues) => {
    createUser.mutate(
      {
        data: {
          email: data.email,
          name: data.name,
          role: data.role,
          ...(data.password ? { password: data.password } : {}),
        },
      },
      {
        onSuccess: (response) => {
          toast.success("המשתמש נוצר");
          invalidate();
          setCreateOpen(false);
          createForm.reset({ email: "", name: "", role: "grader", password: "" });
          if (response?.generatedPassword) {
            setGeneratedCredentials({
              email: response.user.email,
              password: response.generatedPassword,
              label: "סיסמה זמנית למשתמש החדש",
            });
          }
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } } | null)?.data?.error ||
            "אירעה שגיאה ביצירת המשתמש";
          toast.error(message);
        },
      },
    );
  };

  const openEdit = (user: User) => {
    editForm.reset({ name: user.name, role: user.role });
    setEditing(user);
  };

  const handleEdit = (data: EditFormValues) => {
    if (!editing) return;
    updateUser.mutate(
      { userId: editing.id, data },
      {
        onSuccess: () => {
          toast.success("המשתמש עודכן");
          invalidate();
          setEditing(null);
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } } | null)?.data?.error ||
            "אירעה שגיאה בעדכון המשתמש";
          toast.error(message);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteUser.mutate(
      { userId: deleting.id },
      {
        onSuccess: () => {
          toast.success("המשתמש נמחק");
          invalidate();
          setDeleting(null);
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } } | null)?.data?.error ||
            "אירעה שגיאה במחיקת המשתמש";
          toast.error(message);
        },
      },
    );
  };

  const handleResetPassword = (user: User) => {
    resetPasswordMutation.mutate(
      { userId: user.id },
      {
        onSuccess: (response) => {
          toast.success("הסיסמה אופסה והפעלות פעילות נותקו");
          if (response?.temporaryPassword) {
            setGeneratedCredentials({
              email: user.email,
              password: response.temporaryPassword,
              label: `סיסמה זמנית עבור ${user.name}`,
            });
          }
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } } | null)?.data?.error ||
            "אירעה שגיאה באיפוס הסיסמה";
          toast.error(message);
        },
      },
    );
  };

  const handleCopyPassword = async () => {
    if (!generatedCredentials) return;
    try {
      await navigator.clipboard.writeText(generatedCredentials.password);
      toast.success("הסיסמה הועתקה");
    } catch {
      toast.error("לא הצלחנו להעתיק את הסיסמה");
    }
  };

  if (isError) {
    const status = (error as { status?: number } | null)?.status;
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>אין הרשאה</CardTitle>
            <CardDescription>
              {status === 403
                ? "רק מנהלי מערכת יכולים לגשת לעמוד זה."
                : "לא ניתן לטעון את רשימת המשתמשים."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button variant="outline" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                חזרה להגדרות
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">ניהול משתמשים</h1>
          </div>
          <p className="text-muted-foreground">
            הוספה, עריכה ואיפוס סיסמאות של חשבונות מנהלים, מרצים ומתרגלים.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          הוסף משתמש
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UsersIcon className="h-5 w-5 text-primary" />
              חשבונות במערכת
            </CardTitle>
            <CardDescription>
              סך הכול {users?.length ?? 0} חשבונות
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם</TableHead>
                      <TableHead>אימייל</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>נוצר ב</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => {
                      const role = user.role as UserRole;
                      const isSelf = currentUser?.id === user.id;
                      return (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {user.name}
                              {isSelf && (
                                <Badge variant="outline" className="text-xs">
                                  אתה
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm" dir="ltr">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={ROLE_BADGE_CLASSES[role] ?? ""}>
                              <Shield className="h-3 w-3 ml-1" />
                              {ROLE_LABELS[role] ?? user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString("he-IL")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(user)}
                                className="gap-1"
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                עריכה
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetPassword(user)}
                                disabled={resetPasswordMutation.isPending}
                                className="gap-1"
                                data-testid={`button-reset-password-${user.id}`}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                איפוס סיסמה
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleting(user)}
                                disabled={isSelf}
                                className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                מחיקה
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create user dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) createForm.reset({ email: "", name: "", role: "grader", password: "" });
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת משתמש חדש</DialogTitle>
            <DialogDescription>
              מילוי סיסמה אינו חובה — אם משאירים ריק, המערכת תייצר סיסמה זמנית להעברה למשתמש.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם מלא</FormLabel>
                    <FormControl>
                      <Input placeholder="ישראל ישראלי" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אימייל</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="user@example.com"
                        type="email"
                        {...field}
                        dir="ltr"
                        className="text-right"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תפקיד</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">מנהל מערכת</SelectItem>
                        <SelectItem value="lecturer">מרצה</SelectItem>
                        <SelectItem value="grader">מתרגל</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סיסמה ראשונית (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ריק = ייצור סיסמה אקראית"
                        type="password"
                        {...field}
                        dir="ltr"
                        className="text-right"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormDescription>
                      אם משאירים ריק, נציג לך סיסמה זמנית מיד לאחר היצירה.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  צור חשבון
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              עריכת משתמש
            </DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם מלא</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תפקיד</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={editing?.id === currentUser?.id}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">מנהל מערכת</SelectItem>
                        <SelectItem value="lecturer">מרצה</SelectItem>
                        <SelectItem value="grader">מתרגל</SelectItem>
                      </SelectContent>
                    </Select>
                    {editing?.id === currentUser?.id && (
                      <FormDescription>
                        לא ניתן לשנות את התפקיד של החשבון של עצמך.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  שמור שינויים
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את החשבון?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `החשבון של ${deleting.name} (${deleting.email}) יוסר לצמיתות. הציונים שניתנו על ידו יישמרו, אך לא יקושרו עוד למשתמש.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              מחק חשבון
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated password modal */}
      <Dialog
        open={!!generatedCredentials}
        onOpenChange={(open) => !open && setGeneratedCredentials(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {generatedCredentials?.label}
            </DialogTitle>
            <DialogDescription>
              שמור או העבר את הסיסמה כעת — לאחר סגירת החלון לא ניתן יהיה לראות אותה שוב.
            </DialogDescription>
          </DialogHeader>
          {generatedCredentials && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">אימייל</div>
                <div
                  className="p-2 bg-muted/40 border border-border rounded font-mono text-sm"
                  dir="ltr"
                >
                  {generatedCredentials.email}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">סיסמה זמנית</div>
                <div className="flex items-stretch gap-2">
                  <code
                    className="flex-1 p-2 bg-muted/40 border border-border rounded font-mono text-sm select-all"
                    dir="ltr"
                  >
                    {generatedCredentials.password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="shrink-0 gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    העתק
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGeneratedCredentials(null)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
