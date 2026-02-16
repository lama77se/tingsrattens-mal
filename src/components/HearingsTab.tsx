import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

const MOCK_HEARINGS = [
  { id: 1, court: "Stockholms tingsrätt", caseNumber: "T 1234-25", type: "Huvudförhandling", date: "2026-02-16", time: "09:00", room: "Sal 3", parties: "Andersson vs. Johansson" },
  { id: 2, court: "Göteborgs tingsrätt", caseNumber: "B 5678-25", type: "Häktningsförhandling", date: "2026-02-17", time: "10:30", room: "Sal 1", parties: "Åklagaren vs. Eriksson" },
  { id: 3, court: "Malmö tingsrätt", caseNumber: "T 9012-25", type: "Muntlig förberedelse", date: "2026-02-17", time: "13:00", room: "Sal 5", parties: "Svensson vs. Nilsson" },
  { id: 4, court: "Uppsala tingsrätt", caseNumber: "B 3456-25", type: "Huvudförhandling", date: "2026-02-18", time: "09:30", room: "Sal 2", parties: "Åklagaren vs. Larsson" },
  { id: 5, court: "Linköpings tingsrätt", caseNumber: "T 7890-25", type: "Huvudförhandling", date: "2026-02-18", time: "11:00", room: "Sal 4", parties: "Pettersson vs. Karlsson" },
];

const COURTS = ["Alla", "Stockholms tingsrätt", "Göteborgs tingsrätt", "Malmö tingsrätt", "Uppsala tingsrätt", "Linköpings tingsrätt"];
const TYPES = ["Alla", "Huvudförhandling", "Häktningsförhandling", "Muntlig förberedelse"];

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case "Huvudförhandling": return "default";
    case "Häktningsförhandling": return "destructive";
    case "Muntlig förberedelse": return "secondary";
    default: return "outline";
  }
};

export default function HearingsTab() {
  const [search, setSearch] = useState("");
  const [courtFilter, setCourtFilter] = useState("Alla");
  const [typeFilter, setTypeFilter] = useState("Alla");

  const filtered = MOCK_HEARINGS.filter((h) => {
    const matchesSearch = search === "" || 
      h.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      h.parties.toLowerCase().includes(search.toLowerCase()) ||
      h.court.toLowerCase().includes(search.toLowerCase());
    const matchesCourt = courtFilter === "Alla" || h.court === courtFilter;
    const matchesType = typeFilter === "Alla" || h.type === typeFilter;
    return matchesSearch && matchesCourt && matchesType;
  });

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
            {COURTS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Visar {filtered.length} av {MOCK_HEARINGS.length} förhandlingar
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
