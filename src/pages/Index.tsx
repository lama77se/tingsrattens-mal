import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Database } from "lucide-react";
import HearingsTab from "@/components/HearingsTab";
import DataLoadingTab, { FetchAllProgress } from "@/components/DataLoadingTab";
import { Hearing } from "@/lib/parseCourtPdf";

const Index = () => {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [activeTab, setActiveTab] = useState("hearings");
  const [fetchAllTrigger, setFetchAllTrigger] = useState(0);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [fetchAllProgress, setFetchAllProgress] = useState<FetchAllProgress | null>(null);

  const handleFetchAll = useCallback(() => {
    setFetchAllTrigger((n) => n + 1);
    setActiveTab("loading");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[1600px] mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Veckans mål i Tingsrätterna</h1>
              <p className="text-sm text-muted-foreground">Sammanställning av veckans förhandlingar</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="hearings" className="gap-2">
              <Scale className="h-4 w-4" />
              Tingsrättsförhandlingar
            </TabsTrigger>
            <TabsTrigger value="loading" className="gap-2">
              <Database className="h-4 w-4" />
              Laddning av data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hearings">
            <HearingsTab hearings={hearings} onFetchAll={handleFetchAll} isLoadingAll={isLoadingAll} fetchAllProgress={fetchAllProgress} />
          </TabsContent>

          <TabsContent value="loading" forceMount className={activeTab !== "loading" ? "hidden" : undefined}>
            <DataLoadingTab onHearingsFetched={setHearings} fetchAllTrigger={fetchAllTrigger} onLoadingChange={setIsLoadingAll} onProgressChange={setFetchAllProgress} fetchAllProgress={fetchAllProgress} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
