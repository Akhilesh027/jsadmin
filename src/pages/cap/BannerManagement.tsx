// src/pages/admin/BannerManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Image as ImageIcon,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

/** Simple Banner type */
type Banner = {
  id: string;
  name: string;
  navigation: string; // route/path/url
  image?: string; // dataURL for preview (you can replace with uploaded URL later)
  updatedAt: string;
};

/** seed */
const seed: Banner[] = [
  {
    id: "ban_1",
    name: "Home Hero Banner",
    navigation: "/",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    updatedAt: new Date().toISOString(),
  },
];

export default function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>(seed);

  const [q, setQ] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<Banner | null>(null);
  const [openView, setOpenView] = useState<Banner | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return banners;
    return banners.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.navigation.toLowerCase().includes(query)
    );
  }, [banners, q]);

  const onDelete = (id: string) => {
    setBanners((p) => p.filter((b) => b.id !== id));
    toast({ title: "Deleted", description: "Banner removed.", variant: "destructive" });
  };

  return (
    <AdminLayout panelType="cap">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Banner Management</h1>
            <p className="text-sm text-muted-foreground">
              Add banners with image, name and navigation link.
            </p>
          </div>

          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Banner
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative w-full max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search banner name or navigation..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <Th>Banner</Th>
                    <Th>Navigation</Th>
                    <Th>Updated</Th>
                    <Th className="text-right pr-4">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No banners found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => (
                      <tr key={b.id} className="border-t">
                        <Td>
                          <div className="flex items-center gap-3">
                            {b.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={b.image}
                                alt={b.name}
                                className="h-10 w-14 rounded-md object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-14 rounded-md border flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{b.name}</div>
                              <div className="text-xs text-muted-foreground">ID: {b.id}</div>
                            </div>
                          </div>
                        </Td>
                        <Td className="font-mono text-xs">{b.navigation}</Td>
                        <Td className="text-xs">{new Date(b.updatedAt).toLocaleString()}</Td>
                        <Td className="text-right pr-4">
                          <div className="inline-flex items-center gap-2">
                            <Button size="icon" variant="ghost" title="View" onClick={() => setOpenView(b)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Edit" onClick={() => setOpenEdit(b)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Delete" onClick={() => onDelete(b.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create */}
        <BannerFormDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          title="Add Banner"
          initial={null}
          onSave={(payload) => {
            const now = new Date().toISOString();
            const newBanner: Banner = {
              id: `ban_${Math.random().toString(16).slice(2)}`,
              ...payload,
              updatedAt: now,
            };
            setBanners((p) => [newBanner, ...p]);
            setOpenCreate(false);
            toast({ title: "Added", description: "Banner created." });
          }}
        />

        {/* Edit */}
        <BannerFormDialog
          open={!!openEdit}
          onOpenChange={(v) => !v && setOpenEdit(null)}
          title="Edit Banner"
          initial={openEdit}
          onSave={(payload) => {
            if (!openEdit) return;
            const now = new Date().toISOString();
            setBanners((p) =>
              p.map((b) => (b.id === openEdit.id ? { ...b, ...payload, updatedAt: now } : b))
            );
            setOpenEdit(null);
            toast({ title: "Updated", description: "Banner updated." });
          }}
        />

        {/* View */}
        <Dialog open={!!openView} onOpenChange={(v) => !v && setOpenView(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Banner</DialogTitle>
            </DialogHeader>

            {openView && (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{openView.name}</div>
                  <div className="text-sm text-muted-foreground font-mono">{openView.navigation}</div>
                </div>

                {openView.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={openView.image}
                    alt={openView.name}
                    className="w-full max-h-[260px] object-cover rounded-lg border"
                  />
                ) : (
                  <div className="h-[220px] rounded-lg border flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/** ---------------------------
 * Small UI
 * -------------------------- */
function Th({ children, className }: any) {
  return <th className={cn("p-4 font-semibold text-muted-foreground", className)}>{children}</th>;
}
function Td({ children, className }: any) {
  return <td className={cn("p-4 align-top", className)}>{children}</td>;
}

/** ---------------------------
 * Form Dialog (simple)
 * -------------------------- */
type BannerPayload = Omit<Banner, "id" | "updatedAt">;

function BannerFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: Banner | null;
  onSave: (payload: BannerPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [navigation, setNavigation] = useState(initial?.navigation ?? "");
  const [image, setImage] = useState<string>(initial?.image ?? "");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setNavigation(initial?.navigation ?? "");
    setImage(initial?.image ?? "");
  }, [open, initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPickFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!name.trim()) {
      toast({ title: "Missing name", description: "Banner name is required." });
      return;
    }
    if (!navigation.trim()) {
      toast({ title: "Missing navigation", description: "Navigation is required (ex: /home)." });
      return;
    }
    if (!image) {
      toast({ title: "Missing image", description: "Please upload a banner image." });
      return;
    }

    onSave({
      name: name.trim(),
      navigation: navigation.trim(),
      image,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Banner Name*</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Banner" />
            </div>

            <div>
              <Label>Navigation*</Label>
              <Input value={navigation} onChange={(e) => setNavigation(e.target.value)} placeholder="/cap" />
              <p className="text-xs text-muted-foreground mt-1">
                Where should this banner navigate when clicked.
              </p>
            </div>

            <div>
              <Label>Upload Image*</Label>
              <Input type="file" accept="image/*" onChange={(e) => onPickFile(e.target.files?.[0])} />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 1600×600 (or 1200×450).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="preview" className="w-full h-[220px] object-cover rounded-lg border" />
            ) : (
              <div className="w-full h-[220px] rounded-lg border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>{initial ? "Save" : "Add Banner"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
