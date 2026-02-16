import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface CourtSource {
  id: string;
  name: string;
  enabled: boolean;
  lastFetched: string | null;
  status: "idle" | "loading" | "success" | "error";
  count: number;
}

const INITIAL_COURTS: CourtSource[] = [
  { id: "stockholm", name: "Stockholms tingsrätt", enabled: true, lastFetched: "2026-02-16 08:00", status: "success", count: 12 },
  { id: "goteborg", name: "Göteborgs tingsrätt", enabled: true, lastFetched: "2026-02-16 08:00", status: "success", count: 8 },
  { id: "malmo", name: "Malmö tingsrätt", enabled: true, lastFetched: null, status: "idle", count: 0 },
  { id: "uppsala", name: "Uppsala tingsrätt", enabled: false, lastFetched: null, status: "idle", count: 0 },
  { id: "linkoping", name: "Linköpings tingsrätt", enabled: false, lastFetched: null, status: "idle", count: 0 },
  { id: "vasteras", name: "Västerås tingsrätt", enabled: false, lastFetched: null, status: "idle", count: 0 },
  { id: "orebro", name: "Örebro tingsrätt", enabled: false, lastFetched: null, status: "idle", count: 0 },
  { id: "norrkoping", name: "Norrköpings tingsrätt", enabled: false, lastFetched: null, status: "idle", count: 0 },
];

const statusIcon = (status: CourtSource["status"]) => {
  switch (status) {
    case "success": return <CheckCircle2 className="h-4 w-4 text-accent-foreground" />;
    case "loading": return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
    case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function DataLoadingTab() {
  const [courts, setCourts] = useState<CourtSource[]>(INITIAL_COURTS);

  const toggleCourt = (id: string) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleFetchAll = () => {
    setCourts((prev) =>
      prev.map((c) =>
        c.enabled ? { ...c, status: "loading" } : c
      )
    );
    // Simulate fetch
    setTimeout(() => {
      setCourts((prev) =>
        prev.map((c) =>
          c.status === "loading"
            ? { ...c, status: "success", lastFetched: new Date().toLocaleString("sv-SE"), count: Math.floor(Math.random() * 15) + 1 }
            : c
        )
      );
    }, 2000);
  };

  const enabledCount = courts.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {enabledCount} av {courts.length} tingsrätter aktiverade
          </p>
        </div>
        <Button onClick={handleFetchAll} disabled={enabledCount === 0}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Hämta data
        </Button>
      </div>

      <div className="grid gap-3">
        {courts.map((court) => (
          <Card key={court.id} className={`transition-all ${!court.enabled ? "opacity-60" : ""}`}>
            <CardContent className="flex items-center gap-4 py-4 px-5">
              <Checkbox
                checked={court.enabled}
                onCheckedChange={() => toggleCourt(court.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{court.name}</span>
                  {statusIcon(court.status)}
                </div>
                {court.lastFetched && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Senast hämtad: {court.lastFetched}
                  </p>
                )}
              </div>
              {court.count > 0 && (
                <Badge variant="secondary">{court.count} mål</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
