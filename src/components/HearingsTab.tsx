import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Info } from "lucide-react";
import { Hearing } from "@/lib/parseCourtPdf";

interface HearingsTabProps {
  hearings: Hearing[];
}

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case "Huvudförhandling": return "default";
    case "Häktningsförhandling": return "destructive";
    case "Muntlig förberedelse": return "secondary";
    default: return "outline";
  }
};

export default function HearingsTab({ hearings }: HearingsTabProps) {
  const [search, setSearch] = useState("");
  const [courtFilter, setCourtFilter] = useState("Alla");
  const [typeFilter, setTypeFilter] = useState("Alla");

  const courts = useMemo(() => {
    const unique = Array.from(new Set(hearings.map((h) => h.court)));
    return ["Alla", ...unique.sort()];
  }, [hearings]);

  const types = useMemo(() => {
    const unique = Array.from(new Set(hearings.map((h) => h.type)));
    return ["Alla", ...unique.sort()];
  }, [hearings]);

  const filtered = hearings.filter((h) => {
    const matchesSearch = search === "" ||
      h.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      h.parties.toLowerCase().includes(search.toLowerCase()) ||
      h.court.toLowerCase().includes(search.toLowerCase());
    const matchesCourt = courtFilter === "Alla" || h.court === courtFilter;
    const matchesType = typeFilter === "Alla" || h.type === typeFilter;
    return matchesSearch && matchesCourt && matchesType;
  });

  if (hearings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Info className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg">Ingen data hämtad</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Gå till fliken "Laddning av data" och klicka på "Hämta data" för att ladda förhandlingar från domstol.se.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök målnummer, parter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={courtFilter} onValueChange={setCourtFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Tingsrätt" />
          </SelectTrigger>
          <SelectContent>
            {courts.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <TableHead>Datum</TableHead>
              <TableHead>Tid</TableHead>
              <TableHead>Tingsrätt</TableHead>
              <TableHead>Målnummer</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Sal</TableHead>
              <TableHead>Parter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Inga förhandlingar matchar filtren.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((h) => (
                <TableRow key={h.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{h.date}</TableCell>
                  <TableCell>{h.time}</TableCell>
                  <TableCell>{h.court}</TableCell>
                  <TableCell className="font-mono text-sm">{h.caseNumber}</TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(h.type) as any}>{h.type}</Badge>
                  </TableCell>
                  <TableCell>{h.room}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{h.parties}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
