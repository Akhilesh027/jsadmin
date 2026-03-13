import { AdminLayout } from "@/components/layout/AdminLayout";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Download } from "lucide-react"; // optional icon

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.jsgallor.com";

type Estimate = {
  _id: string;
  floorplan: string;
  purpose: string;
  propertyType: string;
  kitchen: boolean;
  wardrobe: number;
  tvUnit: number;
  plotSize?: string;
  floorplanPdfUrl?: string;
  floorplanImageUrls?: string[];
  name?: string;
  phone?: string;
  whatsappUpdates?: boolean;
  city?: string;
  estimatedAmount?: number;
  totalAmount?: number;
  status: "draft" | "submitted";
  createdAt: string;
  updatedAt: string;
};

type ApiResp<T> = { success: boolean; message?: string; data: T };

const AdminEstimates: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Estimate[]>([]);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [selected, setSelected] = useState<Estimate | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [estimatedAmount, setEstimatedAmount] = useState<number | "">("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`${API_BASE}/api/estimates?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json: ApiResp<Estimate[]> = await res.json().catch(() => ({} as any));

      if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch estimates");
      setList(json.data || []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      toast({ title: "Error", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}`, {
        headers: getAuthHeaders(),
      });
      const json: ApiResp<Estimate> = await res.json().catch(() => ({} as any));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch detail");
      setSelected(json.data);
      setEstimatedAmount(json.data.estimatedAmount ?? "");
      setTotalAmount(json.data.totalAmount ?? "");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      toast({ title: "Error", description: e?.message, variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveAmounts = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const payload: any = {};
      if (estimatedAmount !== "") payload.estimatedAmount = Number(estimatedAmount);
      if (totalAmount !== "") payload.totalAmount = Number(totalAmount);

      const res = await fetch(`${API_BASE}/api/estimates/amount/${selected._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const json: ApiResp<Estimate> = await res.json().catch(() => ({} as any));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save amounts");

      const updated = json.data;
      setSelected(updated);
      setEstimatedAmount(updated.estimatedAmount ?? "");
      setTotalAmount(updated.totalAmount ?? "");
      fetchList();

      toast({ title: "Success", description: "Amounts saved successfully" });
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      toast({ title: "Error", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Download Helpers ----------
  const downloadCSV = (data: Estimate[], filename: string) => {
    if (data.length === 0) return;

    const headers = [
      "Date",
      "Customer",
      "Phone",
      "City",
      "Home (Floorplan)",
      "Property Type",
      "Purpose",
      "Kitchen",
      "Wardrobe",
      "TV Unit",
      "Plot Size",
      "Status",
      "Est. Amount (₹)",
      "Total Amount (₹)",
      "PDF URL",
      "Image URLs",
    ];

    const rows = data.map((item) => [
      new Date(item.createdAt).toLocaleString(),
      item.name || "—",
      item.phone || "—",
      item.city || "—",
      item.floorplan,
      item.propertyType,
      item.purpose,
      item.kitchen ? "Yes" : "No",
      item.wardrobe.toString(),
      item.tvUnit.toString(),
      item.plotSize || "—",
      item.status,
      item.estimatedAmount?.toString() || "—",
      item.totalAmount?.toString() || "—",
      item.floorplanPdfUrl || "—",
      (item.floorplanImageUrls || []).join("; "),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadListCSV = () => {
    if (list.length === 0) {
      toast({ title: "No data", description: "No estimates to download", variant: "destructive" });
      return;
    }
    downloadCSV(list, `estimates_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadSingleCSV = (estimate: Estimate) => {
    downloadCSV([estimate], `estimate_${estimate._id.slice(-6)}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => list.length, [list]);

  return (
    <AdminLayout panelType="cap" title="Admin Management" subtitle="Manage system administrators">
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Furniture Estimates</h1>
              <p className="text-sm text-gray-500">Total: {total}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name/phone/city/floorplan..."
                className="w-full sm:w-[320px] border rounded-lg px-3 py-2"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>

              <button
                onClick={fetchList}
                className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Loading..." : "Filter"}
              </button>

              <button
                onClick={downloadListCSV}
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
                disabled={list.length === 0}
              >
                Download All CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">City</th>
                    <th className="text-left p-3">Home</th>
                    <th className="text-left p-3">Property</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Est. Amount</th>
                    <th className="text-left p-3">Total</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && list.length === 0 && (
                    <tr>
                      <td className="p-4 text-gray-500" colSpan={10}>
                        No estimates found.
                      </td>
                    </tr>
                  )}

                  {list.map((row) => (
                    <tr key={row._id} className="border-t">
                      <td className="p-3 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">{row.name || "—"}</td>
                      <td className="p-3">{row.phone || "—"}</td>
                      <td className="p-3">{row.city || "—"}</td>
                      <td className="p-3">{row.floorplan}</td>
                      <td className="p-3">{row.propertyType}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            row.status === "submitted"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {row.estimatedAmount ? `₹${row.estimatedAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3">
                        {row.totalAmount ? `₹${row.totalAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => fetchDetail(row._id)}
                          className="text-red-600 hover:underline"
                        >
                          View
                        </button>
                        <button
                          onClick={() => downloadSingleCSV(row)}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                          title="Download as CSV"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="mt-6 bg-white border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Estimate Details</h2>
                  <p className="text-xs text-gray-500">ID: {selected._id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadSingleCSV(selected)}
                    className="border px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download CSV
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="border px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="py-6 text-gray-500">Loading details...</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 mt-5">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Customer</h3>
                    <div className="text-sm text-gray-700">Name: {selected.name || "—"}</div>
                    <div className="text-sm text-gray-700">Phone: {selected.phone || "—"}</div>
                    <div className="text-sm text-gray-700">City: {selected.city || "—"}</div>
                    <div className="text-sm text-gray-700">
                      WhatsApp Updates: {selected.whatsappUpdates ? "Yes" : "No"}
                    </div>
                    <div className="text-sm text-gray-700">
                      Status: <b>{selected.status}</b>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Home & Requirements</h3>
                    <div className="text-sm text-gray-700">Floorplan: {selected.floorplan}</div>
                    <div className="text-sm text-gray-700">Property Type: {selected.propertyType}</div>
                    <div className="text-sm text-gray-700">Purpose: {selected.purpose}</div>
                    <div className="text-sm text-gray-700">Kitchen: {selected.kitchen ? "Yes" : "No"}</div>
                    <div className="text-sm text-gray-700">Wardrobe: {selected.wardrobe}</div>
                    <div className="text-sm text-gray-700">TV Unit: {selected.tvUnit}</div>
                    <div className="text-sm text-gray-700">Plot Size: {selected.plotSize || "—"}</div>
                  </div>

                  {/* Admin Amounts Section */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="font-semibold mb-3">Admin Amounts</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Estimated Amount (₹)</label>
                        <input
                          type="number"
                          value={estimatedAmount}
                          onChange={(e) =>
                            setEstimatedAmount(e.target.value ? Number(e.target.value) : "")
                          }
                          placeholder="Enter estimated amount"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Total Amount (₹)</label>
                        <input
                          type="number"
                          value={totalAmount}
                          onChange={(e) =>
                            setTotalAmount(e.target.value ? Number(e.target.value) : "")
                          }
                          placeholder="Enter total amount"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={handleSaveAmounts}
                        disabled={saving}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Amounts"}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-semibold mb-2">Floorplan Files</h3>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm">
                        PDF:{" "}
                        {selected.floorplanPdfUrl ? (
                          <a
                            className="text-red-600 underline"
                            href={selected.floorplanPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open PDF
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div className="text-sm">
                        Images:{" "}
                        {selected.floorplanImageUrls?.length ? (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {selected.floorplanImageUrls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`floorplan-${idx}`}
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 text-xs text-gray-500">
                    Created: {new Date(selected.createdAt).toLocaleString()} | Updated:{" "}
                    {new Date(selected.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEstimates;