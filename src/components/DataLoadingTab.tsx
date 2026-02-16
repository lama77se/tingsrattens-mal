import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Circle, FileText } from "lucide-react";
import { getPreviousWeek, getCurrentWeek, getNextWeek } from "@/lib/weekUtils";
import { COURTS, CourtConfig } from "@/lib/courtConfig";
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

const STEP_LABELS = ["Beräknar URL", "Hämtar PDF", "Bearbetar", "Klar"];

function createInitialSteps(): FetchStep[] {
  return STEP_LABELS.map((label) => ({ label, status: "idle" as StepStatus }));
}

function createWeeksForCourt(): WeekFetch[] {
  const previous = getPreviousWeek();
  const current = getCurrentWeek();
  const next = getNextWeek();
  return [
    { week: previous.week, year: previous.year, steps: createInitialSteps() },
    { week: current.week, year: current.year, steps: createInitialSteps() },
    { week: next.week, year: next.year, steps: createInitialSteps() },
  ];
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

type CourtWeeksState = Record<string, WeekFetch[]>;

function initAllCourts(): CourtWeeksState {
  const state: CourtWeeksState = {};
  for (const court of COURTS) {
    state[court.id] = createWeeksForCourt();
  }
  return state;
}

export default function DataLoadingTab({ onHearingsFetched }: DataLoadingTabProps) {
  const [courtWeeks, setCourtWeeks] = useState<CourtWeeksState>(initAllCourts);
  const [fetchingCourts, setFetchingCourts] = useState<Set<string>>(new Set());
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const hearingsRef = useRef<Record<string, Hearing[]>>({});

  const updateStep = useCallback(
    (courtId: string, weekIndex: number, stepIndex: number, update: Partial<FetchStep>) => {
      setCourtWeeks((prev) => ({
        ...prev,
        [courtId]: prev[courtId].map((w, wi) =>
          wi === weekIndex
            ? { ...w, steps: w.steps.map((s, si) => (si === stepIndex ? { ...s, ...update } : s)) }
            : w
        ),
      }));
    },
    []
  );

  const setResult = useCallback(
    (courtId: string, weekIndex: number, result: CourtPdfResult) => {
      setCourtWeeks((prev) => ({
        ...prev,
        [courtId]: prev[courtId].map((w, wi) => (wi === weekIndex ? { ...w, result } : w)),
      }));
    },
    []
  );

  const fetchWeek = async (
    court: CourtConfig,
    weekIndex: number,
    week: number,
    year: number
  ): Promise<CourtPdfResult | undefined> => {
    // Step 0: Beräknar URL
    updateStep(court.id, weekIndex, 0, { status: "active" });
    const url = court.buildUrl(week, year);
    await delay(300);
    updateStep(court.id, weekIndex, 0, { status: "done", detail: url });

    // Step 1: Hämtar PDF
    updateStep(court.id, weekIndex, 1, { status: "active" });
    const result = await fetchCourtPdf(url, week, year);

    if (!result.success) {
      updateStep(court.id, weekIndex, 1, { status: "error", detail: result.error });
      updateStep(court.id, weekIndex, 2, { status: "idle" });
      updateStep(court.id, weekIndex, 3, {
        status: "error",
        detail: result.notFound ? "PDF inte publicerad ännu" : result.error,
      });
      setResult(court.id, weekIndex, result);
      return undefined;
    }

    updateStep(court.id, weekIndex, 1, {
      status: "done",
      detail: `${((result.pdfSizeBytes || 0) / 1024).toFixed(0)} KB`,
    });

    // Step 2: Bearbetar
    updateStep(court.id, weekIndex, 2, { status: "active" });
    await delay(200);
    updateStep(court.id, weekIndex, 2, {
      status: "done",
      detail: `${result.text?.length || 0} tecken extraherade`,
    });

    // Step 3: Klar
    updateStep(court.id, weekIndex, 3, {
      status: "done",
      detail: `~${result.estimatedHearings || 0} förhandlingar`,
    });
    setResult(court.id, weekIndex, result);
    return result;
  };

  const fetchCourt = async (court: CourtConfig): Promise<Hearing[]> => {
    const weeks = createWeeksForCourt();
    setCourtWeeks((prev) => ({ ...prev, [court.id]: weeks }));
    await delay(50);

    const hearings: Hearing[] = [];
    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      const result = await fetchWeek(court, i, w.week, w.year);
      if (result?.success && result.text) {
        const parsed = parseCourtPdf(result.text, court.name);
        parsed.forEach((h, j) => { h.id = `${court.id}-w${i}-${j}`; });
        hearings.push(...parsed);
      }
    }
    return hearings;
  };

  const handleFetchCourt = async (court: CourtConfig) => {
    setFetchingCourts((prev) => new Set(prev).add(court.id));
    const courtHearings = await fetchCourt(court);

    // Store in ref and merge all courts
    hearingsRef.current[court.id] = courtHearings;
    const allHearings = Object.values(hearingsRef.current).flat();
    onHearingsFetched(allHearings);

    setFetchingCourts((prev) => {
      const next = new Set(prev);
      next.delete(court.id);
      return next;
    });
  };

  const handleFetchAll = async () => {
    setIsFetchingAll(true);
    setCourtWeeks(initAllCourts());
    hearingsRef.current = {};
    await delay(50);

    for (const court of COURTS) {
      setFetchingCourts((prev) => new Set(prev).add(court.id));
      const hearings = await fetchCourt(court);
      hearingsRef.current[court.id] = hearings;
      setFetchingCourts((prev) => {
        const next = new Set(prev);
        next.delete(court.id);
        return next;
      });
    }

    const allHearings = Object.values(hearingsRef.current).flat();
    onHearingsFetched(allHearings);
    setIsFetchingAll(false);
  };

  const anyFetching = isFetchingAll || fetchingCourts.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Datahämtning</h3>
          <p className="text-sm text-muted-foreground">
            Hämtar förhandlingar från {COURTS.length} tingsrätter via domstol.se
          </p>
        </div>
        <Button onClick={handleFetchAll} disabled={anyFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingAll ? "animate-spin" : ""}`} />
          Hämta alla
        </Button>
      </div>

      {COURTS.map((court) => {
        const weeks = courtWeeks[court.id] || [];
        const isCourtFetching = fetchingCourts.has(court.id);

        return (
          <div key={court.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{court.name}</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFetchCourt(court)}
                disabled={anyFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isCourtFetching ? "animate-spin" : ""}`} />
                Hämta
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {weeks.map((w, wi) => (
                <Card key={wi}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Vecka {w.week}, {w.year}
                      {wi === 0 && <Badge variant="outline" className="text-xs">Föregående</Badge>}
                      {wi === 1 && <Badge variant="secondary" className="text-xs">Nuvarande</Badge>}
                      {wi === 2 && <Badge variant="outline" className="text-xs">Nästa</Badge>}
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
      })}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
