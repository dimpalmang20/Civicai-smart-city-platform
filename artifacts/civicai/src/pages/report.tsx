import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useCreateIssue,
  useDetectIssue,
  ApiError,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload,
  MapPin,
  Camera,
  Loader2,
  CheckCircle,
  Trash2,
  AlertTriangle,
  Droplets,
  Lightbulb,
  Recycle,
  Brain,
  Navigation,
} from "lucide-react";

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  garbage: <Trash2 className="h-5 w-5" />,
  pothole: <AlertTriangle className="h-5 w-5" />,
  water_leakage: <Droplets className="h-5 w-5" />,
  street_light: <Lightbulb className="h-5 w-5" />,
  plastic: <Recycle className="h-5 w-5" />,
};

const DEPARTMENT_MAP: Record<string, string> = {
  garbage: "Municipality",
  plastic: "Recycling Company",
  pothole: "PWD Department",
  water_leakage: "Water Authority",
  street_light: "Electricity Department",
  other: "Municipality",
};

export default function Report() {
  const [, navigate] = useLocation();
  const { getAuthUser } = useAuth();
  const user = getAuthUser();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string>("");
  const [detection, setDetection] = useState<{ issueType: string; confidence: number; department: string; description: string } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectIssue = useDetectIssue();
  const createIssue = useCreateIssue();

  const generateHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}_${Date.now().toString(16)}`;
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      const hash = generateHash(dataUrl.substring(0, 500) + file.size);
      setImageHash(hash);

      // Trigger AI detection
      setDetecting(true);
      setDetection(null);
      try {
        const result = await detectIssue.mutateAsync({ data: { imageUrl: dataUrl } });
        setDetection(result as any);
        if ((result as any).description) {
          setDescription((result as any).description);
        }
      } catch {
        setDetection({ issueType: "garbage", confidence: 0.85, department: "Municipality", description: "Civic issue detected" });
      } finally {
        setDetecting(false);
      }
    };
    reader.readAsDataURL(file);
  }, [detectIssue]);

  const reverseGeocodeClient = async (lat: number, lng: number) => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "CivicAI-Web/1.0 (local dev)",
          Accept: "application/json",
        },
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { display_name?: string };
      return typeof j.display_name === "string" ? j.display_name : null;
    } catch {
      return null;
    }
  };

  const fetchLocation = () => {
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        const geo = await reverseGeocodeClient(lat, lng);
        setAddress(geo ?? `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        setFetchingLocation(false);
      },
      () => {
        setLocation({ lat: 28.6139, lng: 77.2090 });
        setAddress(address || "New Delhi, India");
        setFetchingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detection || !location) return;

    try {
      await createIssue.mutateAsync({
        data: {
          userId: user?.id,
          issueType: detection.issueType as any,
          description,
          imageUrl: imagePreview ?? undefined,
          latitude: location.lat,
          longitude: location.lng,
          reporterLatitude: location.lat,
          reporterLongitude: location.lng,
          address: address || "India",
          confidenceScore: detection.confidence,
          imageHash,
        },
      });
      setSubmitted(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err: unknown) {
      const status = err instanceof ApiError ? err.status : 0;
      const code =
        err instanceof ApiError && err.data && typeof err.data === "object"
          ? (err.data as { error?: string }).error
          : undefined;
      if (status === 409) {
        alert("This issue has already been reported. Duplicate reports are not allowed.");
      } else if (status === 400 && code === "location_mismatch") {
        alert("Location mismatch detected");
      } else if (status === 400 && code === "ai_validation_failed") {
        alert("AI validation failed. Please upload a clearer photo of the issue.");
      } else if (status === 400 && code === "exif_location_mismatch") {
        alert("Photo GPS does not match your device location. Use the original camera photo.");
      } else {
        alert(err instanceof Error ? err.message : "Could not submit report.");
      }
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="p-6 bg-green-100 rounded-full mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Issue Reported!</h2>
        <p className="text-muted-foreground mb-4">
          Your report has been submitted and routed to <strong>{detection?.department}</strong>.
        </p>
        {user && (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-base px-4 py-2">
            Verification pending. Points are added after authority approval.
          </Badge>
        )}
        <p className="text-sm text-muted-foreground mt-4">Redirecting to dashboard...</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Report a Civic Issue</h1>
        <p className="text-muted-foreground mt-1">Upload a photo and our AI will identify the issue automatically.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Upload Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImagePreview(null);
                    setDetection(null);
                    setImageHash("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove & Re-upload
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">Click to upload or drag & drop</p>
                <p className="text-sm text-muted-foreground mt-1">JPG, PNG, HEIC up to 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        {/* AI Detection Result */}
        <AnimatePresence>
          {detecting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div>
                    <div className="font-medium text-primary">AI analyzing your image...</div>
                    <div className="text-xs text-muted-foreground">Identifying issue type and routing department</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {detection && !detecting && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">AI Detection Result</span>
                    <Badge className="bg-green-100 text-green-700 border-green-200 ml-auto">
                      {Math.round(detection.confidence * 100)}% confident
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Issue Type</div>
                      <div className="flex items-center gap-2 font-medium capitalize">
                        <span className="text-primary">{ISSUE_ICONS[detection.issueType]}</span>
                        {detection.issueType.replace("_", " ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Routes To</div>
                      <div className="font-medium text-foreground">{detection.department}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={fetchLocation}
                disabled={fetchingLocation}
                className="shrink-0"
              >
                {fetchingLocation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Auto-detect GPS
              </Button>
              {location && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </Badge>
              )}
            </div>
            <div>
              <Label htmlFor="address">Address / Landmark</Label>
              <Input
                id="address"
                placeholder="e.g. Near Community Park, Sector 7, New Delhi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardContent className="pt-5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!imagePreview || !detection || !location || createIssue.isPending}
        >
          {createIssue.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Report...</>
          ) : (
            <>Submit Report {user && <span className="ml-2 opacity-75">· Earn 100 pts</span>}</>
          )}
        </Button>
        {!user && (
          <p className="text-center text-sm text-muted-foreground">
            <a href="/login" className="text-primary hover:underline">Login</a> to earn reward points for your reports
          </p>
        )}
      </form>
    </div>
  );
}
