import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, Info, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, ChevronDown, ChevronUp, Clock, MapPin, ExternalLink } from "lucide-react";
import { Hearing } from "@/lib/parseCourtPdf";
import { FetchAllProgress } from "@/components/DataLoadingTab";

interface HearingsTabProps {
  hearings: Hearing[];
  onFetchAll?: () => void;
  isLoadingAll?: boolean;
  fetchAllProgress?: FetchAllProgress | null;
}

type SortKey = "datetime" | "caseNumber" | "type" | "maltyp" | "saken" | "sakomrade" | "lagrum" | "flera";
type SortDir = "asc" | "desc";

const normalizeType = (t: string) => t.trim().normalize("NFC");

const typeBadgeVariant = (type: string) => {
  switch (normalizeType(type)) {
    case "Huvudförhandling": return "default";
    case "Häktningsförhandling": return "destructive";
    case "Muntlig förberedelse": return "secondary";
    default: return "outline";
  }
};

const sortKeyLabels: Record<SortKey, string> = {
  datetime: "Datum + Tid",
  caseNumber: "Målnummer",
  type: "Typ",
  maltyp: "Måltyp",
  saken: "Saken",
  sakomrade: "Sakområde",
  lagrum: "Lagrum",
  flera: "Flera sakfrågor",
};

export default function HearingsTab({ hearings, onFetchAll, isLoadingAll = false, fetchAllProgress }: HearingsTabProps) {
  const [search, setSearch] = useState("");
  const [courtFilter, setCourtFilter] = useState("Alla");
  const [typeFilter, setTypeFilter] = useState("Alla");
  const [dateFilter, setDateFilter] = useState("Alla");
  const [sakomradeFilter, setSakomradeFilter] = useState("Alla");
  const [maltypFilter, setMaltypFilter] = useState("Alla");
  const [fleraSakfragorFilter, setFleraSakfragorFilter] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (courtFilter !== "Alla") count++;
    if (typeFilter !== "Alla") count++;
    if (dateFilter !== "Alla") count++;
    if (sakomradeFilter !== "Alla") count++;
    if (maltypFilter !== "Alla") count++;
    if (fleraSakfragorFilter) count++;
    return count;
  }, [courtFilter, typeFilter, dateFilter, sakomradeFilter, maltypFilter, fleraSakfragorFilter]);

  const courts = useMemo(() => {
    const unique = Array.from(new Set(hearings.map((h) => h.court)));
    return ["Alla", ...unique.sort()];
  }, [hearings]);

  const types = useMemo(() => {
    const unique = Array.from(new Set(hearings.map((h) => normalizeType(h.type))));
    return ["Alla", ...unique.sort()];
  }, [hearings]);

  const dates = useMemo(() => {
    const unique = Array.from(new Set(hearings.map((h) => h.date)));
    return ["Alla", ...unique.sort()];
  }, [hearings]);

  const sakomraden = useMemo(() => {
    const hasEmpty = hearings.some((h) => !h.sakomrade);
    const unique = Array.from(new Set(hearings.map((h) => h.sakomrade).filter(Boolean)));
    return ["Alla", ...(hasEmpty ? ["(Tomt)"] : []), ...unique.sort()];
  }, [hearings]);

  const maltyper = useMemo(() => {
    const unique = Array.from(new Set(hearings.map((h) => h.maltyp).filter(Boolean)));
    return ["Alla", ...unique.sort()];
  }, [hearings]);

  const filtered = hearings.filter((h) => {
    const matchesSearch = search === "" ||
      h.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      h.parties.toLowerCase().includes(search.toLowerCase()) ||
      h.court.toLowerCase().includes(search.toLowerCase()) ||
      h.saken.toLowerCase().includes(search.toLowerCase());
    const matchesCourt = courtFilter === "Alla" || h.court === courtFilter;
    const matchesType = typeFilter === "Alla" || normalizeType(h.type) === normalizeType(typeFilter);
    const matchesDate = dateFilter === "Alla" || h.date === dateFilter;
    const matchesSakomrade = sakomradeFilter === "Alla" || (sakomradeFilter === "(Tomt)" ? !h.sakomrade : h.sakomrade === sakomradeFilter);
    const matchesMaltyp = maltypFilter === "Alla" || h.maltyp === maltypFilter;
    const matchesFleraSakfragor = !fleraSakfragorFilter || h.fleraSakfragor;
    return matchesSearch && matchesCourt && matchesType && matchesDate && matchesSakomrade && matchesMaltyp && matchesFleraSakfragor;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "datetime":
          return dir * (`${a.date} ${a.time}`).localeCompare(`${b.date} ${b.time}`);
        case "caseNumber":
          return dir * a.caseNumber.localeCompare(b.caseNumber);
        case "type":
          return dir * normalizeType(a.type).localeCompare(normalizeType(b.type), "sv");
        case "maltyp":
          return dir * (a.maltyp || "").localeCompare(b.maltyp || "", "sv");
        case "saken":
          return dir * a.saken.localeCompare(b.saken, "sv");
        case "sakomrade":
          return dir * (a.sakomrade || "").localeCompare(b.sakomrade || "", "sv");
        case "lagrum":
          return dir * (a.lagrum || "").localeCompare(b.lagrum || "", "sv");
        case "flera":
          return dir * (Number(a.fleraSakfragor) - Number(b.fleraSakfragor));
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  if (hearings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Info className="h-10 w-10 text-muted-foreground mb-4" />
        <h2 className="font-semibold text-lg">Ingen data hämtad</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Klicka på "Hämta alla" för att ladda förhandlingar från domstol.se, eller gå till fliken "Laddning av data" för att hämta enskilda tingsrätter.
        </p>
        {onFetchAll && (
          <Button onClick={onFetchAll} disabled={isLoadingAll} className="mt-4">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAll ? "animate-spin" : ""}`} />
            {isLoadingAll ? "Hämtar..." : "Hämta alla"}
          </Button>
        )}
        {fetchAllProgress && fetchAllProgress.total > 0 && (
          <div className="mt-4 w-full max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {fetchAllProgress.success + fetchAllProgress.failed} av {fetchAllProgress.total} tingsrätter klara
                {fetchAllProgress.failed > 0 && <span className="text-destructive ml-1">({fetchAllProgress.failed} misslyckade)</span>}
              </span>
              <span className="font-medium">{Math.round(((fetchAllProgress.success + fetchAllProgress.failed) / fetchAllProgress.total) * 100)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              {fetchAllProgress.success > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(fetchAllProgress.success / fetchAllProgress.total) * 100}%` }}
                />
              )}
              {fetchAllProgress.failed > 0 && (
                <div
                  className="h-full bg-destructive transition-all duration-300"
                  style={{ width: `${(fetchAllProgress.failed / fetchAllProgress.total) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const filtersContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      <div className="space-y-1.5">
        <Label>Tingsrätt</Label>
        <Select value={courtFilter} onValueChange={setCourtFilter}>
          <SelectTrigger className="h-11 md:h-10">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Tingsrätt" />
          </SelectTrigger>
          <SelectContent>
            {courts.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Typ</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 md:h-10">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Datum</Label>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="h-11 md:h-10">
            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Datum" />
          </SelectTrigger>
          <SelectContent>
            {dates.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Måltyp</Label>
        <Select value={maltypFilter} onValueChange={setMaltypFilter}>
          <SelectTrigger className="h-11 md:h-10">
            <SelectValue placeholder="Måltyp" />
          </SelectTrigger>
          <SelectContent>
            {maltyper.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Sakområde</Label>
        <Select value={sakomradeFilter} onValueChange={setSakomradeFilter}>
          <SelectTrigger className="h-11 md:h-10">
            <SelectValue placeholder="Sakområde" />
          </SelectTrigger>
          <SelectContent>
            {sakomraden.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>&nbsp;</Label>
        <div className="flex items-center space-x-2 h-11 md:h-10">
          <Checkbox
            id="fleraSakfragor"
            checked={fleraSakfragorFilter}
            onCheckedChange={(checked) => setFleraSakfragorFilter(checked === true)}
          />
          <Label htmlFor="fleraSakfragor" className="cursor-pointer">Flera sakfrågor</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Search — sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background pb-3 -mx-4 px-4 pt-2 md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 md:bg-transparent">
        <div className="space-y-1.5">
          <Label className="hidden md:block">Sök</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Målnummer, parter, tingsrätt, saken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 md:h-10"
            />
          </div>
        </div>

        {/* Mobile filter toggle */}
        <div className="mt-3 md:hidden">
          <Button
            variant="outline"
            className="w-full h-11 justify-between"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </span>
            {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Filters — collapsible on mobile, always visible on desktop */}
      <div className="md:hidden">
        {filtersOpen && (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            {filtersContent}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setCourtFilter("Alla");
                  setTypeFilter("Alla");
                  setDateFilter("Alla");
                  setSakomradeFilter("Alla");
                  setMaltypFilter("Alla");
                  setFleraSakfragorFilter(false);
                }}
              >
                Rensa filter
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="hidden md:block">
        {filtersContent}
      </div>

      {/* Results count + mobile sort controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Visar {filtered.length} av {hearings.length} förhandlingar
        </p>

        {/* Mobile sort — visible below md */}
        <div className="flex items-center gap-2 md:hidden">
          <Label className="text-sm whitespace-nowrap text-muted-foreground">Sortera:</Label>
          <Select
            value={sortKey ?? "none"}
            onValueChange={(val) => {
              if (val === "none") {
                setSortKey(null);
              } else {
                setSortKey(val as SortKey);
              }
            }}
          >
            <SelectTrigger className="h-10 flex-1">
              <SelectValue placeholder="Välj..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Standard</SelectItem>
              {(Object.keys(sortKeyLabels) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>{sortKeyLabels[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!sortKey}
            onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
          >
            {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile card list — visible below md */}
      <div className="md:hidden space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Inga förhandlingar matchar filtren.
          </div>
        ) : (
          sorted.map((h) => (
            <Card key={h.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                {/* Top row: date + time + PDF link */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{h.date}</span>
                    <span className="text-muted-foreground">{h.time}</span>
                  </div>
                  {h.pdfUrl && (
                    <button
                      onClick={() => window.open(h.pdfUrl, '_blank')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Öppna käll-PDF"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Court + hearing type badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{h.court}</span>
                  </div>
                  <Badge variant={typeBadgeVariant(h.type) as any} className="shrink-0 text-xs">
                    {h.type}
                  </Badge>
                </div>

                {/* Case number + måltyp */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono font-medium">{h.caseNumber}</span>
                  {h.maltyp && (
                    <span className="text-muted-foreground">{h.maltyp}</span>
                  )}
                </div>

                {/* Saken — tappable for lagrum popup when available */}
                {h.saken && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Saken: </span>
                    {(h.lagrum || h.sakomrade) ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-left underline decoration-dotted underline-offset-2">
                            {h.saken}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 text-sm space-y-1.5">
                          {h.sakomrade && (
                            <div><span className="text-muted-foreground">Sakområde: </span>{h.sakomrade}</div>
                          )}
                          {h.lagrum && (
                            <div><span className="text-muted-foreground">Lagrum: </span>{h.lagrum}</div>
                          )}
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span>{h.saken}</span>
                    )}
                  </div>
                )}

                {/* Flera sakfrågor indicator */}
                {h.fleraSakfragor && (
                  <div className="text-xs text-primary font-medium pt-1 border-t">
                    Flera sakfrågor
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table — hidden below md */}
      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("datetime")}>
                  Datum + Tid{sortIcon("datetime")}
                </button>
              </TableHead>
              <TableHead>Tingsrätt</TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("caseNumber")}>
                  Målnummer{sortIcon("caseNumber")}
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("type")}>
                  Typ{sortIcon("type")}
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("maltyp")}>
                  Måltyp{sortIcon("maltyp")}
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("saken")}>
                  Saken{sortIcon("saken")}
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("sakomrade")}>
                  Sakområde{sortIcon("sakomrade")}
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("lagrum")}>
                  Lagrum{sortIcon("lagrum")}
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("flera")}>
                  Flera{sortIcon("flera")}
                </button>
              </TableHead>
              <TableHead className="w-10">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Inga förhandlingar matchar filtren.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((h) => (
                <TableRow key={h.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">{h.date} {h.time}</TableCell>
                  <TableCell>{h.court}</TableCell>
                  <TableCell className="font-mono text-sm">{h.caseNumber}</TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(h.type) as any}>{h.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.maltyp || "–"}</TableCell>
                  <TableCell>{h.saken}</TableCell>
                  <TableCell className="text-muted-foreground">{h.sakomrade || "–"}</TableCell>
                  <TableCell className="text-muted-foreground">{h.lagrum || "–"}</TableCell>
                  <TableCell>
                    <Checkbox checked={h.fleraSakfragor} disabled />
                  </TableCell>
                  <TableCell>
                    {h.pdfUrl && (
                      <button
                        onClick={() => window.open(h.pdfUrl, '_blank')}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Öppna käll-PDF"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
