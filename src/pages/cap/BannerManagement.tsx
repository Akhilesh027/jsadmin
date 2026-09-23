// src/pages/admin/BannerManagement.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Video,
  Image as ImageIcon,
  Upload,
  Save,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";

// Local backend port default
const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://api.jsgallor.com";

interface VideoBanner {
  videoUrl: string;
  posterUrl?: string;
  ctaLink?: string;
  isActive?: boolean;
}

interface DualBannerItem {
  bannerIndex: number;
  imageUrl: string;
  ctaLink?: string;
  isActive?: boolean;
}

interface BannerConfig {
  website: "affordable" | "midrange";
  videoBanner: VideoBanner;
  dualBanners: DualBannerItem[];
}

const EMPTY_CONFIG: Record<"affordable" | "midrange", BannerConfig> = {
  affordable: {
    website: "affordable",
    videoBanner: {
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-living-room-with-a-modern-interior-design-4820-large.mp4",
      posterUrl: "",
      ctaLink: "/categories",
      isActive: true,
    },
    dualBanners: [
      {
        bannerIndex: 1,
        imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
        ctaLink: "/categories/living-room",
        isActive: true,
      },
      {
        bannerIndex: 2,
        imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=80",
        ctaLink: "/categories/dining",
        isActive: true,
      },
    ],
  },
  midrange: {
    website: "midrange",
    videoBanner: {
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-living-room-interior-design-4825-large.mp4",
      posterUrl: "",
      ctaLink: "/products",
      isActive: true,
    },
    dualBanners: [
      {
        bannerIndex: 1,
        imageUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80",
        ctaLink: "/products",
        isActive: true,
      },
      {
        bannerIndex: 2,
        imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
        ctaLink: "/products",
        isActive: true,
      },
    ],
  },
};

// Helper to detect YouTube video IDs
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
};

// Helper to detect Vimeo video IDs
const getVimeoVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  return match ? match[3] : null;
};

// Helper to detect Google Drive video IDs
const getGoogleDriveVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export default function BannerManagement() {
  const [activeWebsite, setActiveWebsite] = useState<"affordable" | "midrange">("affordable");
  const [configs, setConfigs] = useState<Record<"affordable" | "midrange", BannerConfig>>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Fetch banner configuration for selected website
  const fetchBannerConfig = async (website: "affordable" | "midrange") => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/banners/${website}?t=${Date.now()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setConfigs((prev) => ({
          ...prev,
          [website]: {
            website,
            videoBanner: {
              videoUrl: json.data.videoBanner?.videoUrl || "",
              posterUrl: json.data.videoBanner?.posterUrl || "",
              ctaLink: json.data.videoBanner?.ctaLink || (website === "affordable" ? "/categories" : "/products"),
              isActive: json.data.videoBanner?.isActive !== false,
            },
            dualBanners:
              Array.isArray(json.data.dualBanners) && json.data.dualBanners.length === 2
                ? json.data.dualBanners
                : EMPTY_CONFIG[website].dualBanners,
          },
        }));
      }
    } catch (err: any) {
      console.warn(`Could not load ${website} banners from local API:`, err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannerConfig(activeWebsite);
  }, [activeWebsite]);

  const currentConfig = configs[activeWebsite];

  const updateVideoBanner = (field: keyof VideoBanner, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [activeWebsite]: {
        ...prev[activeWebsite],
        videoBanner: {
          ...prev[activeWebsite].videoBanner,
          [field]: value,
        },
      },
    }));
  };

  const updateDualBanner = (index: number, field: keyof DualBannerItem, value: any) => {
    setConfigs((prev) => {
      const updatedBanners = [...prev[activeWebsite].dualBanners];
      updatedBanners[index] = {
        ...updatedBanners[index],
        [field]: value,
      };
      return {
        ...prev,
        [activeWebsite]: {
          ...prev[activeWebsite],
          dualBanners: updatedBanners,
        },
      };
    });
  };

  // Image Upload Handler with IMMEDIATE AUTO-SAVE
  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload a valid image file (JPG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(index);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("website", activeWebsite);
    formData.append("bannerIndex", String(index + 1));

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/banners/upload?website=${activeWebsite}&bannerIndex=${index + 1}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();

      if (res.ok && data.imageUrl) {
        updateDualBanner(index, "imageUrl", data.imageUrl);
        toast({
          title: "Image Uploaded & Saved ✅",
          description: `Banner #${index + 1} has been updated and is now live on ${activeWebsite.toUpperCase()} website!`,
        });
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Could not upload image to server.",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  // Save All Changes (Video URL + Navigation Links) to MongoDB
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/banners/${activeWebsite}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("Admintoken") || ""}`,
        },
        body: JSON.stringify({
          videoBanner: currentConfig.videoBanner,
          dualBanners: currentConfig.dualBanners,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save banners");

      toast({
        title: "Banners Saved Successfully ✅",
        description: `Video and dual banners for ${activeWebsite.toUpperCase()} website are updated and live!`,
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Error communicating with backend.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const youtubeId = currentConfig.videoBanner.videoUrl
    ? getYouTubeVideoId(currentConfig.videoBanner.videoUrl)
    : null;
  const vimeoId = currentConfig.videoBanner.videoUrl
    ? getVimeoVideoId(currentConfig.videoBanner.videoUrl)
    : null;
  const driveId = currentConfig.videoBanner.videoUrl
    ? getGoogleDriveVideoId(currentConfig.videoBanner.videoUrl)
    : null;

  return (
    <AdminLayout panelType="cap">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Banner Management</h1>
              <Badge variant="outline" className="border-primary text-primary px-3 py-1">
                Visual Banners (No Text)
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage 1 Hero Video Banner and 2 Dual Promotional Banners. Banners display pure visual media without text overlays.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBannerConfig(activeWebsite)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground min-w-[140px]">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>

        {/* Website Selector Tabs */}
        <div className="flex items-center justify-between">
          <Tabs
            value={activeWebsite}
            onValueChange={(val) => setActiveWebsite(val as "affordable" | "midrange")}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="affordable" className="font-semibold">
                Affordable Website
              </TabsTrigger>
              <TabsTrigger value="midrange" className="font-semibold">
                Mid-Range Website
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Sizing & Dimensions Guide Alert */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs md:text-sm space-y-1 text-blue-900 dark:text-blue-200">
              <span className="font-semibold block">Media Guidelines:</span>
              <ul className="list-disc list-inside space-y-0.5 opacity-90">
                <li>
                  <strong>Video Link:</strong> Works with <strong>YouTube</strong> links, <strong>Vimeo</strong> links, or direct <strong>MP4/WebM</strong> links. Recommended ratio: 16:9.
                </li>
                <li>
                  <strong>Dual Banners:</strong> Recommended size: <strong>800 × 450 px (16:9)</strong> or <strong>1200 × 600 px</strong>. Uploading an image automatically saves it to the database!
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Hero Video Banner */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">1. Hero Video Banner (After Navbar)</CardTitle>
                  <CardDescription>
                    Autoplays muted on loop. Paste YouTube, Vimeo, or direct MP4 URL.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="video-active" className="text-sm font-medium">
                  Active
                </Label>
                <Switch
                  id="video-active"
                  checked={currentConfig.videoBanner.isActive !== false}
                  onCheckedChange={(val) => updateVideoBanner("isActive", val)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form inputs */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Video Link (YouTube, Vimeo, or MP4 URL)*
                  </Label>
                  <Input
                    value={currentConfig.videoBanner.videoUrl}
                    onChange={(e) => updateVideoBanner("videoUrl", e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://.../video.mp4"
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts standard YouTube links, Vimeo, or direct MP4 URLs.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Navigation Link (Optional)
                  </Label>
                  <Input
                    value={currentConfig.videoBanner.ctaLink || ""}
                    onChange={(e) => updateVideoBanner("ctaLink", e.target.value)}
                    placeholder="/categories or /products"
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Where the user goes if they click the video banner.
                  </p>
                </div>
              </div>

              {/* Live Video Player Preview */}
              <div className="lg:col-span-6 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Video Player Preview
                </Label>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border shadow-inner flex items-center justify-center">
                  {youtubeId ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`}
                        className="w-[130%] h-[130%] object-cover pointer-events-none"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        title="YouTube Preview"
                      />
                    </div>
                  ) : vimeoId ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&muted=1&controls=0`}
                        className="w-[125%] h-[125%] object-cover pointer-events-none"
                        allow="autoplay; fullscreen"
                        title="Vimeo Preview"
                      />
                    </div>
                  ) : driveId ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                      <iframe
                        src={`https://drive.google.com/file/d/${driveId}/preview`}
                        className="w-[125%] h-[125%] object-cover pointer-events-none"
                        allow="autoplay"
                        title="Google Drive Preview"
                      />
                    </div>
                  ) : currentConfig.videoBanner.videoUrl ? (
                    <video
                      key={currentConfig.videoBanner.videoUrl}
                      src={currentConfig.videoBanner.videoUrl}
                      poster={currentConfig.videoBanner.posterUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      disablePictureInPicture
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Paste a video link to see live playback</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Dual Banners */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">2. Dual Promotional Banners (Side-by-Side)</CardTitle>
                <CardDescription>
                  Upload pure visual banners (no text overlays). Uploaded images are automatically saved and immediately live.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {currentConfig.dualBanners.map((banner, index) => (
                <div key={index} className="p-5 border rounded-xl space-y-4 bg-card/60 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-bold">
                        Dual Banner #{index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Size: 800×450 px</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`banner-active-${index}`} className="text-xs">
                        Active
                      </Label>
                      <Switch
                        id={`banner-active-${index}`}
                        checked={banner.isActive !== false}
                        onCheckedChange={(val) => updateDualBanner(index, "isActive", val)}
                      />
                    </div>
                  </div>

                  {/* Pure Image Preview Box */}
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden border bg-muted/40 group">
                    {banner.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={banner.imageUrl}
                        alt={`Banner ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
                        <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                        <span className="text-xs font-medium">No banner image uploaded</span>
                        <span className="text-[11px] text-muted-foreground">Recommended: 800×450 px</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Image Button with Auto-Save */}
                  <div>
                    <label className="block w-full">
                      <Button
                        type="button"
                        variant="default"
                        className="w-full text-xs font-semibold"
                        disabled={uploadingIndex === index}
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingIndex === index ? "Uploading & Saving..." : `Upload Banner #${index + 1} Image (800×450)`}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(index, file);
                        }}
                      />
                    </label>
                    <p className="text-[11px] text-green-700 dark:text-green-400 mt-1 font-medium text-center">
                      ⚡ Uploading immediately saves and updates the live website!
                    </p>
                  </div>

                  {/* Manual URL Input */}
                  <div>
                    <Label className="text-xs text-muted-foreground font-medium">Or Image URL</Label>
                    <Input
                      value={banner.imageUrl}
                      onChange={(e) => updateDualBanner(index, "imageUrl", e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  {/* Click Target Navigation Link */}
                  <div>
                    <Label className="text-xs text-muted-foreground font-medium">Click Navigation Link</Label>
                    <Input
                      value={banner.ctaLink || ""}
                      onChange={(e) => updateDualBanner(index, "ctaLink", e.target.value)}
                      placeholder="/categories/living-room or /products"
                      className="mt-1 font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Where the user goes when clicking this banner.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Floating Save Action */}
        <div className="sticky bottom-6 p-4 rounded-xl bg-card/90 backdrop-blur-md border shadow-lg flex items-center justify-between z-30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Editing banners for <strong>{activeWebsite.toUpperCase()}</strong> website</span>
          </div>

          <Button onClick={handleSave} disabled={saving} size="lg" className="px-6 font-semibold">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
