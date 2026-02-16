import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Clock, AlertCircle, Circle, FileText } from "lucide-react";
import { getPreviousWeek, getCurrentWeek, getNextWeek, buildPdfUrl } from "@/lib/weekUtils";
import { fetchCourtPdf, CourtPdfResult } from "@/lib/api/courtPdf";
import { parseCourtPdf, Hearing } from "@/lib/parseCourtPdf";

type StepStatus = "idle" | "active" | "done" | "error";

interface FetchStep {
  label: string;
  status: StepStatus;
  detail?: string;
}

interface WeekFetch {
  week: number;
  year: number;
  steps: FetchStep[];
  result?: CourtPdfResult;
}

interface DataLoadingTabProps {
  onHearingsFetched: (hearings: Hearing[]) => void;
}

const STEP_LABELS = [
  "Beräknar URL",
  "Hämtar PDF",
  "Bearbetar",
  "Klar",
];

function createInitialSteps(): FetchStep[] {
  return STEP_LABELS.map((label) => ({ label, status: "idle" as StepStatus }));
}

const stepIcon = (status: StepStatus) => {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-accent-foreground" />;
    case "active":
      return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function DataLoadingTab({ onHearingsFetched }: DataLoadingTabProps) {
  const previous = getPreviousWeek();
  const current = getCurrentWeek();
  const next = getNextWeek();

  const [weeks, setWeeks] = useState<WeekFetch[]>([
    { week: previous.week, year: previous.year, steps: createInitialSteps() },
    { week: current.week, year: current.year, steps: createInitialSteps() },
    { week: next.week, year: next.year, steps: createInitialSteps() },
  ]);
  const [isFetching, setIsFetching] = useState(false);

  const updateStep = useCallback(
    (weekIndex: number, stepIndex: number, update: Partial<FetchStep>) => {
      setWeeks((prev) =>
        prev.map((w, wi) =>
          wi === weekIndex
            ? {
                ...w,
                steps: w.steps.map((s, si) =>
                  si === stepIndex ? { ...s, ...update } : s
                ),
              }
            : w
        )
      );
    },
    []
  );

  const setResult = useCallback(
    (weekIndex: number, result: CourtPdfResult) => {
      setWeeks((prev) =>
        prev.map((w, wi) => (wi === weekIndex ? { ...w, result } : w))
      );
    },
    []
  );

  const fetchWeek = async (weekIndex: number, week: number, year: number): Promise<CourtPdfResult | undefined> => {
    // Step 0: Beräknar URL
    updateStep(weekIndex, 0, { status: "active" });
    const url = buildPdfUrl("solna_tingsratt", week, year);
    await delay(400);
    updateStep(weekIndex, 0, { status: "done", detail: url });

    // Step 1: Hämtar PDF
    updateStep(weekIndex, 1, { status: "active" });

    const result = await fetchCourtPdf("solna_tingsratt", week, year);

    if (!result.success) {
      updateStep(weekIndex, 1, { status: "error", detail: result.error });
      updateStep(weekIndex, 2, { status: "idle" });
      updateStep(weekIndex, 3, {
        status: "error",
        detail: result.notFound ? "PDF inte publicerad ännu" : result.error,
      });
      setResult(weekIndex, result);
      return undefined;
    }

    updateStep(weekIndex, 1, {
      status: "done",
      detail: `${((result.pdfSizeBytes || 0) / 1024).toFixed(0)} KB`,
    });

    // Step 2: Bearbetar
    updateStep(weekIndex, 2, { status: "active" });
    await delay(300);
    updateStep(weekIndex, 2, {
      status: "done",
      detail: `${(result.text?.length || 0)} tecken extraherade`,
    });

    // Step 3: Klar
    updateStep(weekIndex, 3, {
      status: "done",
      detail: `~${result.estimatedHearings || 0} förhandlingar`,
    });
    setResult(weekIndex, result);
    return result;
  };

  const handleFetchAll = async () => {
    setIsFetching(true);
    // Reset
    setWeeks([
      { week: previous.week, year: previous.year, steps: createInitialSteps() },
      { week: current.week, year: current.year, steps: createInitialSteps() },
      { week: next.week, year: next.year, steps: createInitialSteps() },
    ]);
    await delay(100);

    const allHearings: Hearing[] = [];

    const r1 = await fetchWeek(0, previous.week, previous.year);
    if (r1?.success && r1.text) {
      allHearings.push(...parseCourtPdf(r1.text, "Solna tingsrätt"));
    }

    const r2 = await fetchWeek(1, current.week, current.year);
    if (r2?.success && r2.text) {
      allHearings.push(...parseCourtPdf(r2.text, "Solna tingsrätt"));
    }

    const r3 = await fetchWeek(2, next.week, next.year);
    if (r3?.success && r3.text) {
      allHearings.push(...parseCourtPdf(r3.text, "Solna tingsrätt"));
    }

    onHearingsFetched(allHearings);
    setIsFetching(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Solna tingsrätt</h3>
          <p className="text-sm text-muted-foreground">
            Hämtar veckans förhandlingar som PDF från domstol.se
          </p>
        </div>
        <Button onClick={handleFetchAll} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Hämta data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {weeks.map((w, wi) => (
          <Card key={wi}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Vecka {w.week}, {w.year}
                {wi === 0 && (
                  <Badge variant="outline" className="text-xs">Föregående</Badge>
                )}
                {wi === 1 && (
                  <Badge variant="secondary" className="text-xs">Nuvarande</Badge>
                )}
                {wi === 2 && (
                  <Badge variant="outline" className="text-xs">Nästa</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {w.steps.map((step, si) => (
                <div key={si} className="flex items-start gap-3">
                  <div className="mt-0.5">{stepIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm font-medium ${
                        step.status === "error"
                          ? "text-destructive"
                          : step.status === "done"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.detail && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {w.result?.success && w.result.text && (
                <details className="mt-3 pt-3 border-t">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Visa rådata ({w.result.text.length} tecken)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-3 rounded-md overflow-auto max-h-48 whitespace-pre-wrap">
                    {w.result.text.substring(0, 2000)}
                    {(w.result.text.length || 0) > 2000 && "\n\n... (trunkerad)"}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
