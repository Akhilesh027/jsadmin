import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, type Manufacturer } from "@/data/dummyData";
import { Eye, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com";

type MfgWithId = Manufacturer & {
  id: string;
  email?: string;
  mobile?: string;
  telephone?: string;
  country?: string;
  panNumber?: string;
  profileCompletion?: number;
  totalOrders?: number;
  isActive?: boolean;
  verificationStatus?: string;
};

const normalizeManufacturer = (m: any): MfgWithId => ({
  id: String(m.id || m._id),
  companyName: m.companyName || m.name || m.company || "",
  contactPerson: m.contactPerson || m.legalName || m.ownerName || m.contact || "",
  mobile: m.mobile || m.phone || "",
  telephone: m.telephone || "",
  email: m.email || "",
  city: m.city || "",
  state: m.state || "",
  country: m.country || "",
  gstNumber: m.gstNumber || m.gst || "",
  panNumber: m.panNumber || "",
  catalogCount: Number(m.catalogCount ?? m.activeProducts ?? m.catalogsCount ?? 0),
  totalRevenue: Number(m.totalRevenue ?? m.revenue ?? 0),
  totalOrders: Number(m.totalOrders ?? 0),
  profileCompletion: Number(m.profileCompletion ?? 0),
  isActive: Boolean(m.isActive ?? true),
  verificationStatus: m.verificationStatus,
  status: (m.status || m.verificationStatus || "pending").toString().toLowerCase() as any,
});

const api = {
  list: () => `${API_BASE}/api/admin/manufacturers/all`,
  getOne: (id: string) => `${API_BASE}/api/admin/manufacturers/${id}`, // optional
  update: (id: string) => `${API_BASE}/api/admin/manufacturers/${id}`, // PATCH
  approve: (id: string) => `${API_BASE}/api/admin/manufacturers/${id}/approve`,
  reject: (id: string) => `${API_BASE}/api/admin/manufacturers/${id}/reject`,
  remove: (id: string) => `${API_BASE}/api/admin/manufacturers/${id}`,
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[95%] max-w-3xl rounded-xl bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>

        {footer ? <div className="border-t px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function ManufacturerList() {
  const [manufacturers, setManufacturers] = useState<MfgWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // per-row action loading
  const [rowLoading, setRowLoading] = useState<Record<string, string>>({});
  const setRowBusy = (id: string, action?: string) => {
    setRowLoading((prev) => {
      const next = { ...prev };
      if (!action) delete next[id];
      else next[id] = action;
      return next;
    });
  };

  // view/edit modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<MfgWithId | null>(null);

  // edit form state
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: "",
    legalName: "",
    email: "",
    mobile: "",
    telephone: "",
    city: "",
    country: "",
    gstNumber: "",
    panNumber: "",
    isActive: true,
    verificationStatus: "Pending",
  });

  const fetchManufacturers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(api.list(), {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "Failed to fetch manufacturers");
      }

      const json = await res.json();
      setManufacturers((json?.data || []).map(normalizeManufacturer));
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLocal = (id: string, patch: Partial<MfgWithId>) => {
    setManufacturers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeLocal = (id: string) => {
    setManufacturers((prev) => prev.filter((m) => m.id !== id));
  };

  // ✅ APPROVE
  const handleApprove = async (mfg: MfgWithId) => {
    const id = mfg.id;
    setRowBusy(id, "approve");

    const prevStatus = mfg.status;
    updateLocal(id, { status: "verified", verificationStatus: "Verified", isActive: true });

    try {
      const res = await fetch(api.approve(id), { method: "PATCH" });
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "Approve failed");
      }
      toast({ title: "Manufacturer Approved", description: `${mfg.companyName} has been approved.` });
    } catch (e: any) {
      updateLocal(id, { status: prevStatus });
      toast({ title: "Approve failed", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setRowBusy(id);
    }
  };

  // ✅ REJECT
  const handleReject = async (mfg: MfgWithId) => {
    const id = mfg.id;
    setRowBusy(id, "reject");

    const prevStatus = mfg.status;
    updateLocal(id, { status: "rejected", verificationStatus: "Rejected", isActive: false });

    try {
      const res = await fetch(api.reject(id), { method: "PATCH" });
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "Reject failed");
      }
      toast({ title: "Manufacturer Rejected", description: `${mfg.companyName} has been rejected.`, variant: "destructive" });
    } catch (e: any) {
      updateLocal(id, { status: prevStatus });
      toast({ title: "Reject failed", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setRowBusy(id);
    }
  };

  // ✅ DELETE
  const handleDelete = async (mfg: MfgWithId) => {
    const id = mfg.id;
    const ok = window.confirm(`Delete ${mfg.companyName}? This cannot be undone.`);
    if (!ok) return;

    setRowBusy(id, "delete");
    const prev = manufacturers;
    removeLocal(id);

    try {
      const res = await fetch(api.remove(id), { method: "DELETE" });
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "Delete failed");
      }
      toast({ title: "Manufacturer Deleted", description: `${mfg.companyName} has been removed.`, variant: "destructive" });
    } catch (e: any) {
      setManufacturers(prev);
      toast({ title: "Delete failed", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setRowBusy(id);
    }
  };

  // ✅ VIEW MODAL
  const openView = async (mfg: MfgWithId) => {
    // If you want freshest data from backend, uncomment below and ensure GET /:id exists.
    // const res = await fetch(api.getOne(mfg.id));
    // const json = await res.json();
    // setSelected(normalizeManufacturer(json.data));

    setSelected(mfg);
    setViewOpen(true);
  };

  // ✅ EDIT MODAL
  const openEdit = (mfg: MfgWithId) => {
    setSelected(mfg);
    setEditForm({
      companyName: mfg.companyName || "",
      legalName: mfg.contactPerson || "", // mapping for your schema
      email: mfg.email || "",
      mobile: mfg.mobile || "",
      telephone: mfg.telephone || "",
      city: mfg.city || "",
      country: mfg.country || "",
      gstNumber: mfg.gstNumber || "",
      panNumber: mfg.panNumber || "",
      isActive: Boolean(mfg.isActive ?? true),
      verificationStatus: mfg.verificationStatus || "Pending",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;

    const id = selected.id;

    try {
      setSaving(true);

      const payload = {
        companyName: editForm.companyName,
        legalName: editForm.legalName,
        email: editForm.email,
        mobile: editForm.mobile,
        telephone: editForm.telephone,
        city: editForm.city,
        country: editForm.country,
        gstNumber: editForm.gstNumber,
        panNumber: editForm.panNumber,
        isActive: editForm.isActive,
        verificationStatus: editForm.verificationStatus,
      };

      const res = await fetch(api.update(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "Update failed");
      }

      const json = await res.json();
      const updated = normalizeManufacturer(json?.data || payload);

      // update UI row + selected
      updateLocal(id, updated);
      setSelected((prev) => (prev ? { ...prev, ...updated } : prev));

      toast({ title: "Updated", description: "Manufacturer updated successfully." });
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    toast({ title: "Download Started", description: "Manufacturer list is being downloaded as Excel." });
  };

  const columns = useMemo(
    () => [
      {
        key: "companyName",
        header: "Company",
        render: (mfg: MfgWithId) => (
          <div>
            <p className="font-medium text-foreground">{mfg.companyName}</p>
            <p className="text-sm text-muted-foreground">
              {mfg.city}, {mfg.state}
            </p>
          </div>
        ),
      },
      {
        key: "contactPerson",
        header: "Contact",
        render: (mfg: MfgWithId) => (
          <div>
            <p className="text-foreground">{mfg.contactPerson}</p>
            <p className="text-sm text-muted-foreground">{mfg.mobile}</p>
          </div>
        ),
      },
      { key: "gstNumber", header: "GST No." },
      {
        key: "catalogCount",
        header: "Products",
        render: (mfg: MfgWithId) => <span className="font-medium">{mfg.catalogCount}</span>,
      },
     
      {
        key: "status",
        header: "Status",
        render: (mfg: MfgWithId) => <StatusBadge status={mfg.status} />,
      },
    ],
    []
  );

  const actions = (mfg: MfgWithId) => {
    const busy = rowLoading[mfg.id];
    const isBusy = Boolean(busy);

    return (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBusy} onClick={() => openView(mfg)}>
          <Eye className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBusy} onClick={() => openEdit(mfg)}>
          <Edit className="h-4 w-4" />
        </Button>

        {(mfg.status === "pending" || mfg.status === "under review") && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-success hover:text-success"
              onClick={() => handleApprove(mfg)}
              disabled={isBusy}
              title={busy === "approve" ? "Approving..." : "Approve"}
            >
              <Check className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleReject(mfg)}
              disabled={isBusy}
              title={busy === "reject" ? "Rejecting..." : "Reject"}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => handleDelete(mfg)}
          disabled={isBusy}
          title={busy === "delete" ? "Deleting..." : "Delete"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <AdminLayout panelType="cap" title="Manufacturers" subtitle="Manage all registered manufacturers">
      {loading ? (
        <div className="py-10 text-center text-muted-foreground">Loading manufacturers...</div>
      ) : error ? (
        <div className="py-10 text-center text-red-500">{error}</div>
      ) : (
        <DataTable
          data={manufacturers}
          columns={columns}
          searchKey="companyName"
          searchPlaceholder="Search manufacturers..."
          actions={actions}
          onDownload={handleDownload}
        />
      )}

      {/* ✅ VIEW MODAL */}
      <Modal
        open={viewOpen}
        title="Manufacturer Details"
        onClose={() => {
          setViewOpen(false);
          setSelected(null);
        }}
      >
        {!selected ? (
          <div className="text-muted-foreground">No manufacturer selected.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{selected.companyName}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={selected.status} />
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{selected.email || "-"}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Mobile</p>
              <p className="font-medium">{selected.mobile || "-"}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Telephone</p>
              <p className="font-medium">{selected.telephone || "-"}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">
                {selected.city || "-"}, {selected.country || "-"}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">GST</p>
              <p className="font-medium">{selected.gstNumber || "-"}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">PAN</p>
              <p className="font-medium">{selected.panNumber || "-"}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="font-medium">{selected.catalogCount ?? 0}</p>
            </div>

          

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="font-medium">{selected.totalOrders ?? 0}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Profile Completion</p>
              <p className="font-medium">{selected.profileCompletion ?? 0}%</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ✅ EDIT MODAL */}
      <Modal
        open={editOpen}
        title="Edit Manufacturer"
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-muted-foreground">Company Name</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.companyName}
              onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Legal Name</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.legalName}
              onChange={(e) => setEditForm((p) => ({ ...p, legalName: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Mobile</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.mobile}
              onChange={(e) => setEditForm((p) => ({ ...p, mobile: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Telephone</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.telephone}
              onChange={(e) => setEditForm((p) => ({ ...p, telephone: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">City</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.city}
              onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Country</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.country}
              onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">GST Number</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.gstNumber}
              onChange={(e) => setEditForm((p) => ({ ...p, gstNumber: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">PAN Number</label>
            <input
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.panNumber}
              onChange={(e) => setEditForm((p) => ({ ...p, panNumber: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Verification Status</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editForm.verificationStatus}
              onChange={(e) => setEditForm((p) => ({ ...p, verificationStatus: e.target.value }))}
            >
              <option>Pending</option>
              <option>Under Review</option>
              <option>Verified</option>
              <option>Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="isActive"
              type="checkbox"
              checked={editForm.isActive}
              onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            <label htmlFor="isActive" className="text-sm">
              Active Account
            </label>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
