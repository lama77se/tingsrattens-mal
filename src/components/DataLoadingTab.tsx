import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Circle, FileText, Ban } from "lucide-react";
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

export interface FetchAllProgress {
  total: number;
  success: number;
  failed: number;
  failedNames: string[];
}

interface DataLoadingTabProps {
  onHearingsFetched: (hearings: Hearing[]) => void;
  fetchAllTrigger?: number;
  onLoadingChange?: (loading: boolean) => void;
  onProgressChange?: (progress: FetchAllProgress | null) => void;
  fetchAllProgress?: FetchAllProgress | null;
}

function FetchAllProgressBar({ progress }: { progress: FetchAllProgress }) {
  const { total, success, failed } = progress;
  const done = success + failed;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const successPct = total > 0 ? (success / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {done} av {total} tingsrätter klara
          {failed > 0 && <span className="text-destructive ml-1">({failed} misslyckade)</span>}
        </span>
        <span className="font-medium">{pct}%</span>
      </div>
      {progress.failedNames.length > 0 && (
        <p className="text-xs text-destructive">
          Misslyckade: {progress.failedNames.join(", ")}
        </p>
      )}
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        {successPct > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${successPct}%` }}
          />
        )}
        {failedPct > 0 && (
          <div
            className="h-full bg-destructive transition-all duration-300"
            style={{ width: `${failedPct}%` }}
          />
        )}
      </div>
    </div>
  );
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
  const current = getCurrentWeek();
  const state: CourtWeeksState = {};
  for (const court of COURTS) {
    state[court.id] = court.singleUrl
      ? [{ week: current.week, year: current.year, steps: createInitialSteps() }]
      : createWeeksForCourt();
  }
  return state;
}

export default function DataLoadingTab({ onHearingsFetched, fetchAllTrigger, onLoadingChange, onProgressChange, fetchAllProgress }: DataLoadingTabProps) {
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
    const urlOrUrls = court.buildUrl(week, year);
    const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
    await delay(300);
    updateStep(court.id, weekIndex, 0, {
      status: "done",
      detail: urls.join("\n"),
    });

    // Step 1: Hämtar PDF — try each candidate URL in order
    updateStep(court.id, weekIndex, 1, { status: "active" });
    let result: CourtPdfResult | undefined;
    const triedUrls: { url: string; ok: boolean; reason?: string }[] = [];
    for (const url of urls) {
      updateStep(court.id, weekIndex, 1, {
        status: "active",
        detail: urls.length > 1 ? `Testar ${triedUrls.length + 1}/${urls.length}...` : undefined,
      });
      const attempt = await fetchCourtPdf(url, week, year, court.pdfYTolerance);
      const reason = !attempt.success
        ? (attempt.errorCode === "direct_404" ? "404" : attempt.error?.substring(0, 50))
        : undefined;
      triedUrls.push({ url, ok: attempt.success, reason });
      if (attempt.success) {
        result = attempt;
        break;
      }
      result = attempt;
    }

    const urlSummary = triedUrls
      .map(({ url, ok, reason }) => `${ok ? "\u2713" : "\u2717"} ${url}${reason ? ` (${reason})` : ""}`)
      .join("\n");

    if (!result || !result.success) {
      updateStep(court.id, weekIndex, 1, { status: "error", detail: urlSummary });
      updateStep(court.id, weekIndex, 2, { status: "idle" });
      updateStep(court.id, weekIndex, 3, {
        status: "error",
        detail: result?.notFound ? "PDF inte publicerad ännu" : result?.error,
      });
      if (result) setResult(court.id, weekIndex, result);
      return undefined;
    }

    updateStep(court.id, weekIndex, 1, {
      status: "done",
      detail: `${((result.pdfSizeBytes || 0) / 1024).toFixed(0)} KB\n${urlSummary}`,
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

  const fetchCourt = async (court: CourtConfig): Promise<{ hearings: Hearing[]; anySuccess: boolean }> => {
    const current = getCurrentWeek();
    const weeks = court.singleUrl
      ? [{ week: current.week, year: current.year, steps: createInitialSteps() }]
      : createWeeksForCourt();
    setCourtWeeks((prev) => ({ ...prev, [court.id]: weeks }));
    await delay(50);

    const hearings: Hearing[] = [];
    const seen = new Set<string>();
    let anySuccess = false;
    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      const result = await fetchWeek(court, i, w.week, w.year);
      if (result?.success && result.text) {
        anySuccess = true;
        const parsed = parseCourtPdf(result.text, court);
        for (const h of parsed) {
          const key = `${h.caseNumber}|${h.date}|${h.time}|${h.saken}`;
          if (seen.has(key)) continue;
          seen.add(key);
          h.id = `${court.id}-w${i}-${hearings.length}`;
          h.pdfUrl = result.url;
          hearings.push(h);
        }
      }
    }
    return { hearings, anySuccess };
  };

  const handleFetchCourt = async (court: CourtConfig) => {
    setFetchingCourts((prev) => new Set(prev).add(court.id));
    const { hearings: courtHearings } = await fetchCourt(court);

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
    const BATCH_SIZE = 5;
    setIsFetchingAll(true);
    setCourtWeeks(initAllCourts());
    hearingsRef.current = {};
    await delay(50);

    const fetchable = COURTS.filter((c) => !c.disabled);
    const progress: FetchAllProgress = { total: fetchable.length, success: 0, failed: 0, failedNames: [] };
    onProgressChange?.({ ...progress });

    for (let i = 0; i < fetchable.length; i += BATCH_SIZE) {
      const batch = fetchable.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (court) => {
          setFetchingCourts((prev) => new Set(prev).add(court.id));
          const { hearings, anySuccess } = await fetchCourt(court);
          hearingsRef.current[court.id] = hearings;

          if (anySuccess) {
            progress.success++;
          } else {
            progress.failed++;
            progress.failedNames.push(court.name);
          }
          onProgressChange?.({ ...progress, failedNames: [...progress.failedNames] });

          setFetchingCourts((prev) => {
            const next = new Set(prev);
            next.delete(court.id);
            return next;
          });
        })
      );

      // Publish results after each batch so UI updates progressively
      const allHearings = Object.values(hearingsRef.current).flat();
      onHearingsFetched(allHearings);
    }

    setIsFetchingAll(false);
  };

  const anyFetching = isFetchingAll || fetchingCourts.size > 0;

  useEffect(() => {
    onLoadingChange?.(anyFetching);
  }, [anyFetching, onLoadingChange]);

  // Allow external trigger (e.g. from HearingsTab empty state)
  useEffect(() => {
    if (fetchAllTrigger && fetchAllTrigger > 0 && !anyFetching) {
      handleFetchAll();
    }
  }, [fetchAllTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Datahämtning</h2>
          <p className="text-sm text-muted-foreground">
            Hämtar förhandlingar från {COURTS.filter((c) => !c.disabled).length} av {COURTS.length} tingsrätter via domstol.se
          </p>
        </div>
        <Button onClick={handleFetchAll} disabled={anyFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingAll ? "animate-spin" : ""}`} />
          Hämta alla
        </Button>
      </div>

      {fetchAllProgress && fetchAllProgress.total > 0 && (
        <FetchAllProgressBar progress={fetchAllProgress} />
      )}

      {[...COURTS].sort((a, b) => a.name.localeCompare(b.name, "sv")).map((court) => {
        if (court.disabled) {
          return (
            <div key={court.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-muted-foreground">{court.name}</h3>
                  <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              {court.note && (
                <p className="text-sm text-muted-foreground italic">{court.note}</p>
              )}
            </div>
          );
        }

        const weeks = courtWeeks[court.id] || [];
        const isCourtFetching = fetchingCourts.has(court.id);

        return (
          <div key={court.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{court.name}</h3>
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
                      {weeks.length > 1 && wi === 0 && <Badge variant="outline" className="text-xs">Föregående</Badge>}
                      {weeks.length > 1 && wi === 1 && <Badge variant="secondary" className="text-xs">Nuvarande</Badge>}
                      {weeks.length > 1 && wi === 2 && <Badge variant="outline" className="text-xs">Nästa</Badge>}
                      {weeks.length === 1 && <Badge variant="secondary" className="text-xs">Aktuell vecka</Badge>}
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
                            <p className="text-xs text-muted-foreground mt-0.5 break-all whitespace-pre-line">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

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
