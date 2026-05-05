import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Download, Loader2, Eye, FileText, ImageIcon, File } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://api.jsgallor.com";

// Expanded Estimation type to include all document fields and nested sections
type Estimation = {
  _id: string;
  projectName: string;
  clientName: string;
  location: string;
  estimatedCost: number;
  step: string;
  vendorId?: {
    _id: string;
    businessName: string;
    vendorName: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  description?: string;
  servicesOffered?: string;
  // Nested sections
  userDetails?: {
    clientName?: string;
    companyName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  quotationDetails?: {
    quotationNumber?: string;
    quotationDate?: string;
    validTill?: string;
    quotationAmount?: number;
    notes?: string;
  };
  finalOrder?: {
    updatedDetails?: string;
    currentStage?: string;
    estimationCost?: number;
    description?: string;
    stages?: string;
  };
  updatesSection?: {
    updateType?: string;
    progressTitle?: string;
    progressNote?: string;
    nextAction?: string;
    followUpDate?: string;
    progressPercent?: number;
  };
  closingSection?: {
    closingSummary?: string;
    closingRequirements?: string;
    currentStage?: string;
    handoverDone?: boolean;
    paymentClosed?: boolean;
    clientApproved?: boolean;
    supportShared?: boolean;
  };
  // File fields
  estimationDocument?: string;
  quotationDocument?: string;
  finalOrderImages?: string[];
  updateAttachments?: string[];
  closingImages?: string[];
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data as T;
}

function getFileUrl(filePath: string) {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  // Remove leading 'uploads/' if present and serve from base URL
  const clean = filePath.replace(/^uploads[\\/]/, "");
  return `${API_BASE}/uploads/${clean}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function VendorReports() {
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEst, setSelectedEst] = useState<Estimation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchEstimations = async () => {
    setLoading(true);
    try {
      const res = await api<any>("/api/admins/estimations");
      const list = Array.isArray(res) ? res : res.estimations || [];
      setEstimations(list);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setEstimations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimations();
  }, []);

  const filtered = useMemo(() => {
    let result = [...estimations];
    if (statusFilter !== "all") {
      result = result.filter((e) => e.step === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.projectName?.toLowerCase().includes(term) ||
          e.clientName?.toLowerCase().includes(term) ||
          e.location?.toLowerCase().includes(term) ||
          e.vendorId?.businessName?.toLowerCase().includes(term) ||
          e.vendorId?.vendorName?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [estimations, searchTerm, statusFilter]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = [
      "Project Name",
      "Client Name",
      "Location",
      "Estimated Cost (₹)",
      "Step",
      "Vendor",
      "Created At",
      "Updated At",
    ];
    const rows = filtered.map((e) => [
      e.projectName,
      e.clientName,
      e.location,
      e.estimatedCost,
      e.step,
      e.vendorId?.businessName || e.vendorId?.vendorName || "N/A",
      new Date(e.createdAt).toLocaleDateString(),
      new Date(e.updatedAt).toLocaleDateString(),
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "CSV downloaded." });
  };

  const stepColors: Record<string, string> = {
    Estimation: "bg-blue-100 text-blue-800",
    Quotation: "bg-yellow-100 text-yellow-800",
    "Final Order": "bg-purple-100 text-purple-800",
    Update: "bg-orange-100 text-orange-800",
    Closing: "bg-green-100 text-green-800",
  };

  const handleViewDetails = (est: Estimation) => {
    setSelectedEst(est);
    setDetailsOpen(true);
  };

  const renderFileList = (files: string[] | undefined, title: string) => {
    if (!files || files.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="font-semibold text-sm text-muted-foreground">{title}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((file, idx) => {
            const url = getFileUrl(file);
            const fileName = file.split("/").pop() || file;
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-md hover:bg-muted/80"
              >
                <FileText className="h-3 w-3" />
                {fileName}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout panelType="pap-vendor" title="All Estimations" subtitle="View all vendor estimations with full details and documents">
      <div className="space-y-6 p-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project, client, location, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All Steps</option>
              <option value="Estimation">Estimation</option>
              <option value="Quotation">Quotation</option>
              <option value="Final Order">Final Order</option>
              <option value="Update">Update</option>
              <option value="Closing">Closing</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchEstimations} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Est. Cost (₹)</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading estimations...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No estimations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((est) => (
                    <TableRow key={est._id}>
                      <TableCell className="font-medium">{est.projectName}</TableCell>
                      <TableCell>{est.clientName}</TableCell>
                      <TableCell>{est.location}</TableCell>
                      <TableCell className="text-right">
                        ₹{Number(est.estimatedCost).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge className={stepColors[est.step] || "bg-gray-100"}>
                          {est.step}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {est.vendorId?.businessName || est.vendorId?.vendorName || "—"}
                      </TableCell>
                      <TableCell>{new Date(est.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(est)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        {!loading && filtered.length > 0 && (
          <div className="text-sm text-muted-foreground text-right">
            Total estimations: {filtered.length} | Total value: ₹
            {filtered.reduce((sum, e) => sum + (Number(e.estimatedCost) || 0), 0).toLocaleString("en-IN")}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estimation Details</DialogTitle>
            <DialogDescription>
              {selectedEst?.projectName} – {selectedEst?.clientName}
            </DialogDescription>
          </DialogHeader>
          {selectedEst && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Project Name</p>
                  <p>{selectedEst.projectName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p>{selectedEst.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p>{selectedEst.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="font-semibold">₹{Number(selectedEst.estimatedCost).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Step</p>
                  <Badge className={stepColors[selectedEst.step]}>{selectedEst.step}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p>{selectedEst.vendorId?.businessName || selectedEst.vendorId?.vendorName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Email</p>
                  <p>{selectedEst.vendorId?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Phone</p>
                  <p>{selectedEst.vendorId?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p>{formatDate(selectedEst.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p>{formatDate(selectedEst.updatedAt)}</p>
                </div>
              </div>

              {selectedEst.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedEst.description}</p>
                </div>
              )}

              {/* User Details (nesting) */}
              {selectedEst.userDetails && Object.keys(selectedEst.userDetails).some(k => !!selectedEst.userDetails?.[k as keyof typeof selectedEst.userDetails]) && (
                <div>
                  <h3 className="text-md font-semibold">User/Client Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    {selectedEst.userDetails?.clientName && <div><span className="text-muted-foreground">Client:</span> {selectedEst.userDetails.clientName}</div>}
                    {selectedEst.userDetails?.companyName && <div><span className="text-muted-foreground">Company:</span> {selectedEst.userDetails.companyName}</div>}
                    {selectedEst.userDetails?.phone && <div><span className="text-muted-foreground">Phone:</span> {selectedEst.userDetails.phone}</div>}
                    {selectedEst.userDetails?.email && <div><span className="text-muted-foreground">Email:</span> {selectedEst.userDetails.email}</div>}
                    {selectedEst.userDetails?.address && <div><span className="text-muted-foreground">Address:</span> {selectedEst.userDetails.address}</div>}
                  </div>
                </div>
              )}

              {/* Quotation Details */}
              {selectedEst.quotationDetails && Object.keys(selectedEst.quotationDetails).some(k => !!selectedEst.quotationDetails?.[k as keyof typeof selectedEst.quotationDetails]) && (
                <div>
                  <h3 className="text-md font-semibold">Quotation Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div><span className="text-muted-foreground">Quotation #:</span> {selectedEst.quotationDetails.quotationNumber || "—"}</div>
                    <div><span className="text-muted-foreground">Date:</span> {selectedEst.quotationDetails.quotationDate || "—"}</div>
                    <div><span className="text-muted-foreground">Valid Till:</span> {selectedEst.quotationDetails.validTill || "—"}</div>
                    <div><span className="text-muted-foreground">Amount:</span> ₹{Number(selectedEst.quotationDetails.quotationAmount || 0).toLocaleString()}</div>
                    {selectedEst.quotationDetails.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selectedEst.quotationDetails.notes}</div>}
                  </div>
                </div>
              )}

              {/* Final Order */}
              {selectedEst.finalOrder && Object.keys(selectedEst.finalOrder).some(k => !!selectedEst.finalOrder?.[k as keyof typeof selectedEst.finalOrder]) && (
                <div>
                  <h3 className="text-md font-semibold">Final Order</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div><span className="text-muted-foreground">Updated Details:</span> {selectedEst.finalOrder.updatedDetails || "—"}</div>
                    <div><span className="text-muted-foreground">Current Stage:</span> {selectedEst.finalOrder.currentStage || "—"}</div>
                    <div><span className="text-muted-foreground">Estimation Cost:</span> ₹{Number(selectedEst.finalOrder.estimationCost || 0).toLocaleString()}</div>
                    <div><span className="text-muted-foreground">Stages:</span> {selectedEst.finalOrder.stages || "—"}</div>
                    {selectedEst.finalOrder.description && <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {selectedEst.finalOrder.description}</div>}
                  </div>
                </div>
              )}

              {/* Updates Section */}
              {selectedEst.updatesSection && Object.keys(selectedEst.updatesSection).some(k => !!selectedEst.updatesSection?.[k as keyof typeof selectedEst.updatesSection]) && (
                <div>
                  <h3 className="text-md font-semibold">Updates</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div><span className="text-muted-foreground">Update Type:</span> {selectedEst.updatesSection.updateType || "—"}</div>
                    <div><span className="text-muted-foreground">Progress Title:</span> {selectedEst.updatesSection.progressTitle || "—"}</div>
                    <div><span className="text-muted-foreground">Next Action:</span> {selectedEst.updatesSection.nextAction || "—"}</div>
                    <div><span className="text-muted-foreground">Follow-up Date:</span> {selectedEst.updatesSection.followUpDate || "—"}</div>
                    <div><span className="text-muted-foreground">Progress %:</span> {selectedEst.updatesSection.progressPercent || 0}%</div>
                    {selectedEst.updatesSection.progressNote && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> {selectedEst.updatesSection.progressNote}</div>}
                  </div>
                </div>
              )}

              {/* Closing Section */}
              {selectedEst.closingSection && (Object.keys(selectedEst.closingSection).some(k => !!selectedEst.closingSection?.[k as keyof typeof selectedEst.closingSection]) ) && (
                <div>
                  <h3 className="text-md font-semibold">Closing Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div><span className="text-muted-foreground">Current Stage:</span> {selectedEst.closingSection.currentStage || "—"}</div>
                    <div><span className="text-muted-foreground">Closing Requirements:</span> {selectedEst.closingSection.closingRequirements || "—"}</div>
                    {selectedEst.closingSection.closingSummary && <div className="col-span-2"><span className="text-muted-foreground">Summary:</span> {selectedEst.closingSection.closingSummary}</div>}
                    <div><span className="text-muted-foreground">Handover Done:</span> {selectedEst.closingSection.handoverDone ? "✅ Yes" : "❌ No"}</div>
                    <div><span className="text-muted-foreground">Payment Closed:</span> {selectedEst.closingSection.paymentClosed ? "✅ Yes" : "❌ No"}</div>
                    <div><span className="text-muted-foreground">Client Approved:</span> {selectedEst.closingSection.clientApproved ? "✅ Yes" : "❌ No"}</div>
                    <div><span className="text-muted-foreground">Support Shared:</span> {selectedEst.closingSection.supportShared ? "✅ Yes" : "❌ No"}</div>
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div>
                <h3 className="text-md font-semibold">Attached Documents</h3>
                {renderFileList(selectedEst.estimationDocument ? [selectedEst.estimationDocument] : [], "Estimation Document")}
                {renderFileList(selectedEst.quotationDocument ? [selectedEst.quotationDocument] : [], "Quotation Document")}
                {renderFileList(selectedEst.finalOrderImages, "Final Order Images")}
                {renderFileList(selectedEst.updateAttachments, "Update Attachments")}
                {renderFileList(selectedEst.closingImages, "Closing Images")}
                {!selectedEst.estimationDocument && !selectedEst.quotationDocument && (!selectedEst.finalOrderImages || selectedEst.finalOrderImages.length === 0) && (!selectedEst.updateAttachments || selectedEst.updateAttachments.length === 0) && (!selectedEst.closingImages || selectedEst.closingImages.length === 0) && (
                  <p className="text-sm text-muted-foreground">No documents attached.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}