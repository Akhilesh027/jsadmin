import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Home,
  MessageCircle,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
  Filter,
  Download,
  DollarSign,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "https://api.jsgallor.com";
  }
  return "https://api.jsgallor.com";
};

export type InteriorInquiry = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  formType: "consultation" | "experience_center_visit" | "cost_estimator" | "general_inquiry";
  bhk?: string;
  plotMeasurements?: string;
  budgetEstimation?: string;
  city?: string;
  locality?: string;
  selectedTier?: string;
  selectedRooms?: string[];
  calculatedEstimate?: number;
  notes?: string;
  status: "new" | "contacted" | "in_discussion" | "scheduled" | "converted" | "closed";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  total: number;
  new: number;
  inDiscussion: number;
  converted: number;
  scheduled: number;
};

const STATUS_CONFIG: Record<
  InteriorInquiry["status"],
  { label: string; bg: string; text: string; border: string }
> = {
  new: {
    label: "New Lead",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  contacted: {
    label: "Contacted",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  in_discussion: {
    label: "In Discussion",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  scheduled: {
    label: "Visit Scheduled",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  converted: {
    label: "Converted / Closed",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  closed: {
    label: "Archived / Dropped",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-300 dark:border-gray-700",
  },
};

const FORM_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  consultation: { label: "3D Design Consultation", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  experience_center_visit: { label: "Experience Center Visit", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
  cost_estimator: { label: "Cost Estimator Lead", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  general_inquiry: { label: "General Inquiry", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
};

export default function InteriorInquiries() {
  const [inquiries, setInquiries] = useState<InteriorInquiry[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    new: 0,
    inDiscussion: 0,
    converted: 0,
    scheduled: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formTypeFilter, setFormTypeFilter] = useState("all");
  const [bhkFilter, setBhkFilter] = useState("all");

  // Selected inquiry for detail modal
  const [selectedInquiry, setSelectedInquiry] = useState<InteriorInquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<InteriorInquiry["status"]>("new");
  const [adminNotes, setAdminNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Fetch inquiries from API
  const fetchInquiries = async () => {
    setLoading(true);
    const apiBase = getApiBase();
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (formTypeFilter !== "all") params.append("formType", formTypeFilter);
      if (bhkFilter !== "all") params.append("bhk", bhkFilter);
      if (search.trim()) params.append("search", search.trim());
      params.append("limit", "100");

      let res: Response;
      try {
        res = await fetch(`${apiBase}/api/interior/inquiries?${params.toString()}`);
      } catch {
        // Fallback to production API if localhost is unreachable
        res = await fetch(`https://api.jsgallor.com/api/interior/inquiries?${params.toString()}`);
      }

      if (!res.ok) throw new Error("Failed to fetch inquiries");
      const data = await res.json();
      setInquiries(data.data || []);
    } catch (err: any) {
      console.error("Error fetching inquiries:", err);
      toast({
        title: "Error loading inquiries",
        description: err.message || "Failed to load inquiries from server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats summary
  const fetchStats = async () => {
    const apiBase = getApiBase();
    try {
      let res: Response;
      try {
        res = await fetch(`${apiBase}/api/interior/inquiries/stats`);
      } catch {
        res = await fetch(`https://api.jsgallor.com/api/interior/inquiries/stats`);
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchInquiries();
    fetchStats();
  }, [statusFilter, formTypeFilter, bhkFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInquiries();
  };

  // Open modal
  const handleOpenDetail = (inquiry: InteriorInquiry) => {
    setSelectedInquiry(inquiry);
    setEditStatus(inquiry.status);
    setAdminNotes(inquiry.adminNotes || "");
    setIsModalOpen(true);
  };

  // Save updated status and notes
  const handleSaveStatusAndNotes = async () => {
    if (!selectedInquiry) return;
    setSavingStatus(true);
    const apiBase = getApiBase();

    try {
      let res: Response;
      const payload = { status: editStatus, adminNotes };

      try {
        res = await fetch(`${apiBase}/api/interior/inquiries/${selectedInquiry._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch(`https://api.jsgallor.com/api/interior/inquiries/${selectedInquiry._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Failed to update inquiry status");
      const data = await res.json();

      toast({
        title: "Status Updated",
        description: "Inquiry status and notes have been saved.",
      });

      // Update local state
      setInquiries((prev) =>
        prev.map((item) => (item._id === selectedInquiry._id ? data.data : item))
      );
      setSelectedInquiry(data.data);
      fetchStats();
      setIsModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update inquiry.",
        variant: "destructive",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  // Delete inquiry
  const handleDeleteInquiry = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the inquiry from ${name}?`)) return;

    const apiBase = getApiBase();
    try {
      let res: Response;
      try {
        res = await fetch(`${apiBase}/api/interior/inquiries/${id}`, { method: "DELETE" });
      } catch {
        res = await fetch(`https://api.jsgallor.com/api/interior/inquiries/${id}`, { method: "DELETE" });
      }

      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Deleted", description: "Inquiry removed successfully." });
      setInquiries((prev) => prev.filter((item) => item._id !== id));
      fetchStats();
      if (selectedInquiry?._id === id) setIsModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete inquiry",
        variant: "destructive",
      });
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (inquiries.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const rows = inquiries.map((item) => ({
      "Inquiry ID": item._id,
      "Customer Name": item.name,
      Phone: item.phone,
      Email: item.email || "N/A",
      "Form Source": item.formType,
      "Floorplan / BHK": item.bhk || "N/A",
      "Plot / Measurements": item.plotMeasurements || "N/A",
      "Budget Estimation": item.budgetEstimation || "N/A",
      City: item.city || "Hyderabad",
      Locality: item.locality || "N/A",
      "Selected Tier": item.selectedTier || "N/A",
      "Estimated Total": item.calculatedEstimate ? `₹${item.calculatedEstimate}` : "N/A",
      Status: STATUS_CONFIG[item.status]?.label || item.status,
      "Admin Notes": item.adminNotes || "",
      "Submission Date": new Date(item.createdAt).toLocaleString("en-IN"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Interior Inquiries");
    XLSX.writeFile(wb, `JSGALLOR_Interior_Inquiries_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtered in-memory list (if search wasn't re-queried)
  const filteredList = useMemo(() => {
    return inquiries.filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.locality && item.locality.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q))
      );
    });
  }, [inquiries, search]);

  return (
    <AdminLayout
      panelType="cap"
      title="Interior Inquiries & Leads"
      subtitle="Manage all customer consultations, walk-in requests, and design quote submissions from the Interior portal."
    >
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Total Leads</span>
                <Sparkles className="w-4 h-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">All portal submissions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>New Inquiries</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.new}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Requires callback / follow-up</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>In Discussion</span>
                <UserCheck className="w-4 h-4 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.inDiscussion}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active conversations</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Visits Scheduled</span>
                <Building className="w-4 h-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {stats.scheduled}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Experience center appointments</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Converted</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.converted}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Closed design agreements</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar & Controls */}
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name, phone, locality, city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 text-xs"
                  />
                </div>
                <Button type="submit" variant="secondary" className="h-10 text-xs px-4">
                  Search
                </Button>
              </form>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </Button>
                <Button
                  onClick={() => {
                    fetchInquiries();
                    fetchStats();
                  }}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="h-10 text-xs gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs">
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status Filter
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses ({stats.total})</SelectItem>
                    <SelectItem value="new">New Leads</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="in_discussion">In Discussion</SelectItem>
                    <SelectItem value="scheduled">Visit Scheduled</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Archived / Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Form Type Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Source Form Type
                </label>
                <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Form Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Source Types</SelectItem>
                    <SelectItem value="consultation">3D Design Consultation</SelectItem>
                    <SelectItem value="experience_center_visit">Experience Center Visit</SelectItem>
                    <SelectItem value="cost_estimator">Cost Estimator Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BHK Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Home className="w-3 h-3" /> Floorplan Configuration
                </label>
                <Select value={bhkFilter} onValueChange={setBhkFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Configurations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All BHK Configurations</SelectItem>
                    <SelectItem value="1 BHK">1 BHK</SelectItem>
                    <SelectItem value="2 BHK">2 BHK</SelectItem>
                    <SelectItem value="3 BHK">3 BHK</SelectItem>
                    <SelectItem value="4 BHK">4 BHK</SelectItem>
                    <SelectItem value="Villa / Penthouse">Villa / Penthouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inquiries Table */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Customer Details</th>
                  <th className="p-3.5">Source & Layout</th>
                  <th className="p-3.5">Budget / Estimate</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Lead Status</th>
                  <th className="p-3.5">Submitted On</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading interior inquiries...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="space-y-2">
                        <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/50" />
                        <p className="font-medium text-foreground">No inquiries found</p>
                        <p className="text-[11px]">Try adjusting your search criteria or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
                    const typeInfo = FORM_TYPE_LABELS[item.formType] || FORM_TYPE_LABELS.consultation;
                    const cleanPhone = item.phone.replace(/\D/g, "");
                    const waMessage = encodeURIComponent(
                      `Hello ${item.name}, thank you for reaching out to JS GALLOR Interiors regarding your ${item.bhk || "home"} project. We are following up on your inquiry!`
                    );

                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-muted/40 transition-colors group"
                      >
                        {/* Customer */}
                        <td className="p-3.5 pl-4 align-top">
                          <div className="font-bold text-foreground text-[13px]">{item.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${item.phone}`}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors font-mono"
                              title="Call customer"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{item.phone}</span>
                            </a>
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                              title="Direct WhatsApp chat"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </div>
                          {item.email && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">
                              {item.email}
                            </div>
                          )}
                        </td>

                        {/* Source & Layout */}
                        <td className="p-3.5 align-top space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                          <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                            <Home className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{item.bhk || "3 BHK"}</span>
                          </div>
                          {item.plotMeasurements && (
                            <div className="text-[11px] text-muted-foreground">
                              Area: {item.plotMeasurements}
                            </div>
                          )}
                        </td>

                        {/* Budget */}
                        <td className="p-3.5 align-top">
                          <div className="font-semibold text-foreground">
                            {item.budgetEstimation ||
                              (item.calculatedEstimate
                                ? `₹${item.calculatedEstimate.toLocaleString("en-IN")}`
                                : "Flexible")}
                          </div>
                          {item.selectedTier && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                              Tier: {item.selectedTier}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="p-3.5 align-top">
                          <div className="font-medium text-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{item.city || "Hyderabad"}</span>
                          </div>
                          {item.locality && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {item.locality}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 align-top">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                          >
                            {statusInfo.label}
                          </span>
                          {item.adminNotes && (
                            <div
                              className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic max-w-[140px]"
                              title={item.adminNotes}
                            >
                              Note: {item.adminNotes}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-3.5 align-top text-muted-foreground">
                          <div>
                            {new Date(item.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[10px]">
                            {new Date(item.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-4 align-top text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            onClick={() => handleOpenDetail(item)}
                            size="sm"
                            variant="default"
                            className="h-8 text-xs px-3"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleDeleteInquiry(item._id, item.name)}
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Lead Detail & Status Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedInquiry && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between pr-4">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      Lead Details & Management
                    </DialogTitle>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${FORM_TYPE_LABELS[selectedInquiry.formType]?.color || "bg-muted"
                        }`}
                    >
                      {FORM_TYPE_LABELS[selectedInquiry.formType]?.label || selectedInquiry.formType}
                    </span>
                  </div>
                  <DialogDescription className="text-xs">
                    Submitted on {new Date(selectedInquiry.createdAt).toLocaleString("en-IN")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 text-xs py-2">
                  {/* Customer Information Box */}
                  <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                    <div className="font-bold text-sm text-foreground flex items-center justify-between">
                      <span>{selectedInquiry.name}</span>
                      <a
                        href={`https://wa.me/91${selectedInquiry.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary shrink-0" />
                        <a href={`tel:${selectedInquiry.phone}`} className="hover:text-foreground font-mono">
                          {selectedInquiry.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary shrink-0" />
                        <span>{selectedInquiry.email || "Email not provided"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span>
                          {selectedInquiry.locality ? `${selectedInquiry.locality}, ` : ""}
                          {selectedInquiry.city || "Hyderabad"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span>ID: {selectedInquiry._id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border space-y-1.5">
                      <div className="text-muted-foreground font-medium text-[11px]">
                        Property Configuration
                      </div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Home className="w-4 h-4 text-amber-600" />
                        <span>{selectedInquiry.bhk || "3 BHK"}</span>
                      </div>
                      {selectedInquiry.plotMeasurements && (
                        <div className="text-[11px] text-muted-foreground">
                          Plot / Area: {selectedInquiry.plotMeasurements}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border space-y-1.5">
                      <div className="text-muted-foreground font-medium text-[11px]">
                        Budget Estimation / Quote
                      </div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span>
                          {selectedInquiry.budgetEstimation ||
                            (selectedInquiry.calculatedEstimate
                              ? `₹${selectedInquiry.calculatedEstimate.toLocaleString("en-IN")}`
                              : "Flexible")}
                        </span>
                      </div>
                      {selectedInquiry.selectedTier && (
                        <div className="text-[11px] text-muted-foreground">
                          Tier: {selectedInquiry.selectedTier}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimator Rooms (if any) */}
                  {selectedInquiry.selectedRooms && selectedInquiry.selectedRooms.length > 0 && (
                    <div className="p-3.5 rounded-xl border space-y-2">
                      <div className="text-muted-foreground font-medium text-[11px]">
                        Selected Interior Rooms & Spaces:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInquiry.selectedRooms.map((room, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium"
                          >
                            {room.replace(/_/g, " ").toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Management & Internal Admin Notes */}
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <span>Admin Lead Management</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Change Lead Status
                      </label>
                      <Select
                        value={editStatus}
                        onValueChange={(val: any) => setEditStatus(val)}
                      >
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New Lead (Needs Contact)</SelectItem>
                          <SelectItem value="contacted">Contacted (WhatsApp/Call Done)</SelectItem>
                          <SelectItem value="in_discussion">In Discussion (Requirements Gathering)</SelectItem>
                          <SelectItem value="scheduled">Visit Scheduled (Experience Center Appointment)</SelectItem>
                          <SelectItem value="converted">Converted (Project Booked)</SelectItem>
                          <SelectItem value="closed">Archived / Dropped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Internal Admin Notes & Follow-up History
                      </label>
                      <Textarea
                        placeholder="Add notes about customer discussions, architect allocation, custom quote requirements, etc..."
                        rows={3}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 text-xs"
                    onClick={() => handleDeleteInquiry(selectedInquiry._id, selectedInquiry.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Inquiry
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(false)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingStatus}
                      onClick={handleSaveStatusAndNotes}
                      className="text-xs"
                    >
                      {savingStatus ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                          Saving...
                        </>
                      ) : (
                        "Save Updates"
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
