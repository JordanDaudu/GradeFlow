import { useState } from "react";
import { useLocation } from "wouter";
import { 
  useListFeedbackTemplates, 
  useCreateFeedbackTemplate, 
  useUpdateFeedbackTemplate, 
  useDeleteFeedbackTemplate,
  type FeedbackTemplate,
} from "@workspace/api-client-react";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Tag,
  Copy,
  Check
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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

const templateSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  body: z.string().min(1, "תוכן נדרש"),
  category: z.string().optional().or(z.literal("")),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{id: number} | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useListFeedbackTemplates();
  
  const createTemplate = useCreateFeedbackTemplate();
  const updateTemplate = useUpdateFeedbackTemplate();
  const deleteTemplate = useDeleteFeedbackTemplate();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: "",
      body: "",
      category: "",
    },
  });

  const categories = Array.from(new Set(templates?.map(t => t.category).filter(Boolean) as string[]));

  const filteredTemplates = templates?.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openCreateDialog = () => {
    setEditingTemplate(null);
    form.reset({ title: "", body: "", category: selectedCategory || "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: FeedbackTemplate) => {
    setEditingTemplate({ id: template.id });
    form.reset({
      title: template.title,
      body: template.body,
      category: template.category || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmitForm = (data: TemplateFormValues) => {
    const payload = {
      ...data,
      category: data.category || undefined,
    };

    if (editingTemplate) {
      updateTemplate.mutate(
        { templateId: editingTemplate.id, data: payload },
        {
          onSuccess: () => {
            toast.success("התבנית עודכנה בהצלחה");
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/feedback-templates"] });
          },
          onError: () => toast.error("אירעה שגיאה בעדכון התבנית")
        }
      );
    } else {
      createTemplate.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast.success("התבנית נוצרה בהצלחה");
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/feedback-templates"] });
          },
          onError: () => toast.error("אירעה שגיאה ביצירת התבנית")
        }
      );
    }
  };

  const onConfirmDelete = () => {
    if (!deleteTemplateId) return;
    
    deleteTemplate.mutate(
      { templateId: deleteTemplateId },
      {
        onSuccess: () => {
          toast.success("התבנית נמחקה בהצלחה");
          setDeleteTemplateId(null);
          queryClient.invalidateQueries({ queryKey: ["/api/feedback-templates"] });
        },
        onError: () => {
          toast.error("אירעה שגיאה במחיקת התבנית");
          setDeleteTemplateId(null);
        }
      }
    );
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("הטקסט הועתק ללוח");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">תבניות משוב</h1>
          <p className="text-muted-foreground mt-1">
            מאגר תגובות והערות מוכנות מראש לשימוש מהיר בבדיקת מטלות
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          תבנית חדשה
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="חיפוש תבניות משוב..." 
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible">
            <div className="flex sm:flex-wrap gap-2 w-max sm:w-auto pb-1 sm:pb-0">
              <Badge 
                variant={selectedCategory === null ? "default" : "outline"} 
                className="cursor-pointer text-sm py-1 px-3 whitespace-nowrap shrink-0"
                onClick={() => setSelectedCategory(null)}
              >
                הכל
              </Badge>
              {categories.map(cat => (
                <Badge 
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "secondary"} 
                  className="cursor-pointer text-sm py-1 px-3 whitespace-nowrap shrink-0"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card className="h-full flex flex-col hover:shadow-md transition-all group border-border/60 hover:border-primary/30">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-lg leading-tight truncate" title={template.title}>
                      {template.title}
                    </h3>
                    {template.category && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        <span>{template.category}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex -mr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTemplateId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 flex-1">
                  <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap mt-2 line-clamp-4 relative group-hover:bg-muted/50 transition-colors">
                    {template.body}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-border/40 mt-auto p-4 bg-muted/10">
                  <Button 
                    variant="secondary" 
                    className="w-full gap-2"
                    onClick={() => copyToClipboard(template.body, template.id)}
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        הועתק!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        העתק טקסט
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">לא נמצאו תבניות</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {searchQuery || selectedCategory
              ? "לא נמצאו תבניות משוב התואמות את החיפוש שלך." 
              : "עדיין לא יצרת תבניות משוב. צור תבניות כדי לחסוך זמן בכתיבת הערות שחוזרות על עצמן."}
          </p>
          {!searchQuery && !selectedCategory && (
            <Button onClick={openCreateDialog} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              צור תבנית חדשה
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "עריכת תבנית משוב" : "יצירת תבנית משוב חדשה"}</DialogTitle>
            <DialogDescription>
              שמור טקסטים נפוצים לשימוש חוזר בבדיקת מטלות.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כותרת (לזיהוי קל)</FormLabel>
                    <FormControl>
                      <Input placeholder="לדוגמה: הערה על חוסר פירוט" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>קטגוריה (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input placeholder="לדוגמה: קוד, עיצוב, מתמטיקה..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תוכן המשוב</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="הטקסט שיודבק בממשק הבדיקה..." 
                        className="resize-none h-40 font-mono text-sm leading-relaxed" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                  {(createTemplate.isPending || updateTemplate.isPending) ? "שומר..." : "שמור תבנית"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את התבנית מהמאגר. ההערות שכבר ניתנו לסטודנטים המבוססות על תבנית זו לא יושפעו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? "מוחק..." : "מחק תבנית"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}