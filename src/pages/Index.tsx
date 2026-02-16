import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Database } from "lucide-react";
import HearingsTab from "@/components/HearingsTab";
import DataLoadingTab from "@/components/DataLoadingTab";
import { Hearing } from "@/lib/parseCourtPdf";

const Index = () => {
  const [hearings, setHearings] = useState<Hearing[]>([]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-5">
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
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="hearings" className="space-y-6">
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
            <HearingsTab hearings={hearings} />
          </TabsContent>

          <TabsContent value="loading">
            <DataLoadingTab onHearingsFetched={setHearings} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
