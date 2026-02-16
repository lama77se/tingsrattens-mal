import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, Filter, Info, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Hearing } from "@/lib/parseCourtPdf";

interface HearingsTabProps {
  hearings: Hearing[];
  onFetchAll?: () => void;
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

export default function HearingsTab({ hearings, onFetchAll }: HearingsTabProps) {
  const [search, setSearch] = useState("");
  const [courtFilter, setCourtFilter] = useState("Alla");
  const [typeFilter, setTypeFilter] = useState("Alla");
  const [dateFilter, setDateFilter] = useState("Alla");
  const [sakomradeFilter, setSakomradeFilter] = useState("Alla");
  const [maltypFilter, setMaltypFilter] = useState("Alla");
  const [fleraSakfragorFilter, setFleraSakfragorFilter] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
        <h3 className="font-semibold text-lg">Ingen data hämtad</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Klicka på "Hämta alla" för att ladda förhandlingar från domstol.se, eller gå till fliken "Laddning av data" för att hämta enskilda tingsrätter.
        </p>
        {onFetchAll && (
          <Button onClick={onFetchAll} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Hämta alla
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-1.5">
        <Label>Sök</Label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Målnummer, parter, tingsrätt, saken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="space-y-1.5">
          <Label>Tingsrätt</Label>
          <Select value={courtFilter} onValueChange={setCourtFilter}>
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
          <div className="flex items-center space-x-2 h-10">
            <Checkbox
              id="fleraSakfragor"
              checked={fleraSakfragorFilter}
              onCheckedChange={(checked) => setFleraSakfragorFilter(checked === true)}
            />
            <Label htmlFor="fleraSakfragor" className="cursor-pointer">Flera sakfrågor</Label>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Visar {filtered.length} av {hearings.length} förhandlingar
      </p>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">

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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
