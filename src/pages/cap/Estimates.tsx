import { AdminLayout } from "@/components/layout/AdminLayout";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Download, FileText, Image as ImageIcon, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.jsgallor.com";

type Estimate = {
  _id: string;
  floorplan: string;
  purpose: string;
  propertyType: string;
  // Furniture items (kitchen & wardrobe removed)
  tvUnit: number;
  sofaSet: number;
  beds: number;
  centerTables: number;
  crockeryUnit: number;
  diningTableSet: number;
  foyers: number;
  vanityUnit: number;
  studyUnit: number;
  outdoorFurniture: number;
  plotSize?: string;
  planFileUrl?: string;
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

  const [downloadingAll, setDownloadingAll] = useState(false);

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

  const fetchFullEstimate = async (id: string): Promise<Estimate> => {
    const res = await fetch(`${API_BASE}/api/estimates/${id}`, {
      headers: getAuthHeaders(),
    });
    const json: ApiResp<Estimate> = await res.json().catch(() => ({} as any));
    if (!res.ok || !json.success) throw new Error(json.message || "Failed to fetch estimate details");
    return json.data;
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    setError("");
    try {
      const data = await fetchFullEstimate(id);
      setSelected(data);
      setEstimatedAmount(data.estimatedAmount ?? "");
      setTotalAmount(data.totalAmount ?? "");
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

  // ---------- CSV Helpers ----------
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

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
      "TV Unit",
      "Sofa Set",
      "Beds",
      "Center Tables",
      "Crockery Unit",
      "Dining Table Set",
      "Foyers",
      "Vanity Unit",
      "Study Unit",
      "Outdoor Furniture",
      "Plot Size",
      "Plan File URL",
      "PDF URL",
      "Image URLs",
      "Status",
      "Est. Amount (₹)",
      "Total Amount (₹)",
    ];

    const rows = data.map((item) => [
      new Date(item.createdAt).toLocaleString(),
      item.name || "—",
      item.phone || "—",
      item.city || "—",
      item.floorplan,
      item.propertyType,
      item.purpose,
      item.tvUnit?.toString() ?? "0",
      item.sofaSet?.toString() ?? "0",
      item.beds?.toString() ?? "0",
      item.centerTables?.toString() ?? "0",
      item.crockeryUnit?.toString() ?? "0",
      item.diningTableSet?.toString() ?? "0",
      item.foyers?.toString() ?? "0",
      item.vanityUnit?.toString() ?? "0",
      item.studyUnit?.toString() ?? "0",
      item.outdoorFurniture?.toString() ?? "0",
      item.plotSize || "—",
      item.planFileUrl || "—",
      item.floorplanPdfUrl || "—",
      (item.floorplanImageUrls || []).join("; "),
      item.status,
      item.estimatedAmount?.toString() || "—",
      item.totalAmount?.toString() || "—",
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

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

  const downloadListCSV = async () => {
    if (list.length === 0) {
      toast({ title: "No data", description: "No estimates to download", variant: "destructive" });
      return;
    }

    setDownloadingAll(true);
    setError("");
    try {
      const fullEstimates = await Promise.all(
        list.map((item) => fetchFullEstimate(item._id))
      );
      downloadCSV(fullEstimates, `estimates_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ title: "Success", description: "All estimates downloaded" });
    } catch (e: any) {
      const msg = e?.message || "Failed to download all estimates";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  const downloadSingleCSV = async (estimate: Estimate) => {
    try {
      const fullEstimate = await fetchFullEstimate(estimate._id);
      downloadCSV([fullEstimate], `estimate_${estimate._id.slice(-6)}_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({ title: "Success", description: "Estimate downloaded" });
    } catch (e: any) {
      const msg = e?.message || "Failed to download estimate";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => list.length, [list]);

  const closeModal = () => {
    setSelected(null);
    setEstimatedAmount("");
    setTotalAmount("");
  };

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
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={list.length === 0 || downloadingAll}
              >
                {downloadingAll ? "Fetching details..." : "Download All CSV"}
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

          {/* Modal */}
          {selected && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={closeModal}
            >
              <div
                className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
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
                      onClick={closeModal}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  {detailLoading ? (
                    <div className="py-6 text-gray-500 text-center">Loading details...</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Customer Info */}
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

                      {/* Home & Property */}
                      <div className="space-y-2">
                        <h3 className="font-semibold">Home & Requirements</h3>
                        <div className="text-sm text-gray-700">Floorplan: {selected.floorplan}</div>
                        <div className="text-sm text-gray-700">Property Type: {selected.propertyType}</div>
                        <div className="text-sm text-gray-700">Purpose: {selected.purpose}</div>
                        <div className="text-sm text-gray-700">Plot Size: {selected.plotSize || "—"}</div>
                      </div>

                      {/* Furniture Quantities */}
                      <div className="md:col-span-2 border-t pt-4">
                        <h3 className="font-semibold mb-3">Furniture Quantities</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm">
                          <div>TV Unit: {selected.tvUnit ?? 0}</div>
                          <div>Sofa Set: {selected.sofaSet ?? 0}</div>
                          <div>Beds: {selected.beds ?? 0}</div>
                          <div>Center Tables: {selected.centerTables ?? 0}</div>
                          <div>Crockery Unit: {selected.crockeryUnit ?? 0}</div>
                          <div>Dining Table Set: {selected.diningTableSet ?? 0}</div>
                          <div>Foyers: {selected.foyers ?? 0}</div>
                          <div>Vanity Unit: {selected.vanityUnit ?? 0}</div>
                          <div>Study Unit: {selected.studyUnit ?? 0}</div>
                          <div>Outdoor Furniture: {selected.outdoorFurniture ?? 0}</div>
                        </div>
                      </div>

                      {/* Uploaded Files */}
                      <div className="md:col-span-2 border-t pt-4">
                        <h3 className="font-semibold mb-3">Uploaded Files</h3>
                        <div className="space-y-3">
                          {selected.planFileUrl && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <span className="font-medium">2D/3D Plan:</span>{" "}
                                <a
                                  href={selected.planFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-red-600 underline"
                                >
                                  View Plan
                                </a>
                              </div>
                            </div>
                          )}
                          {selected.floorplanPdfUrl && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <span className="font-medium">Floorplan PDF:</span>{" "}
                                <a
                                  href={selected.floorplanPdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-red-600 underline"
                                >
                                  Open PDF
                                </a>
                              </div>
                            </div>
                          )}
                          {selected.floorplanImageUrls && selected.floorplanImageUrls.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">Floorplan Images:</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                            </div>
                          )}
                          {!selected.planFileUrl && !selected.floorplanPdfUrl && (!selected.floorplanImageUrls?.length) && (
                            <div className="text-gray-500 text-sm">No files uploaded.</div>
                          )}
                        </div>
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

                      {/* Timestamps */}
                      <div className="md:col-span-2 text-xs text-gray-500">
                        Created: {new Date(selected.createdAt).toLocaleString()} | Updated:{" "}
                        {new Date(selected.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEstimates;