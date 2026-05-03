import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const MODES = [
  { value: "quarters", label: "Quarti (8 squadre)", slots: 8 },
  { value: "semis", label: "Semifinali (4 squadre)", slots: 4 },
  { value: "final", label: "Solo Finale (2 squadre)", slots: 2 },
];

export const FinalPhaseWizard = ({ open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mode, setMode] = useState<"quarters" | "semis" | "final">("quarters");
  const [periodDuration, setPeriodDuration] = useState(25);
  const [totalPeriods, setTotalPeriods] = useState(2);
  const [hasTriangolare, setHasTriangolare] = useState(false);
  const [teams, setTeams] = useState<string[]>([]);
  const [newTeam, setNewTeam] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data || [],
  });

  const { data: opponentTeams = [] } = useQuery({
    queryKey: ["opponent-teams", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase.from("opponent_teams").select("*").eq("category_id", categoryId).order("name");
      return data || [];
    },
    enabled: !!categoryId,
  });

  useEffect(() => {
    if (categoryId) {
      const cat = categories.find((c: any) => c.id === categoryId);
      if (cat) {
        setPeriodDuration(cat.default_period_duration ?? 25);
        setTotalPeriods(cat.default_total_periods ?? 2);
      }
    }
  }, [categoryId, categories]);

  const slotCount = MODES.find(m => m.value === mode)!.slots;

  const addTeam = (n: string) => {
    const t = n.trim();
    if (!t) return;
    if (teams.includes(t)) return;
    if (teams.length >= slotCount) {
      toast.error(`Max ${slotCount} squadre per questa modalità`);
      return;
    }
    setTeams([...teams, t]);
    setNewTeam("");
  };

  const removeTeam = (i: number) => setTeams(teams.filter((_, idx) => idx !== i));

  const reset = () => {
    setName(""); setCategoryId(""); setMode("quarters");
    setPeriodDuration(25); setTotalPeriods(2); setHasTriangolare(false);
    setTeams([]); setNewTeam("");
  };

  const generateBracket = (phaseId: string, seedTeams: string[]) => {
    // pad with TBD
    const padded = [...seedTeams];
    while (padded.length < slotCount) padded.push("TBD");

    const rounds: { round: string; matches: { team_home: string | null; team_away: string | null; slot: number }[] }[] = [];

    if (mode === "quarters") {
      rounds.push({
        round: "quarters",
        matches: Array.from({ length: 4 }, (_, i) => ({
          team_home: padded[i * 2], team_away: padded[i * 2 + 1], slot: i,
        })),
      });
      rounds.push({ round: "semis", matches: [{ team_home: null, team_away: null, slot: 0 }, { team_home: null, team_away: null, slot: 1 }] });
      rounds.push({ round: "final", matches: [{ team_home: null, team_away: null, slot: 0 }] });
    } else if (mode === "semis") {
      rounds.push({
        round: "semis",
        matches: Array.from({ length: 2 }, (_, i) => ({
          team_home: padded[i * 2], team_away: padded[i * 2 + 1], slot: i,
        })),
      });
      rounds.push({ round: "final", matches: [{ team_home: null, team_away: null, slot: 0 }] });
    } else {
      rounds.push({
        round: "final",
        matches: [{ team_home: padded[0], team_away: padded[1], slot: 0 }],
      });
    }

    const inserts = rounds.flatMap(r => r.matches.map(m => ({
      phase_id: phaseId, round: r.round, slot: m.slot,
      team_home: m.team_home, team_away: m.team_away,
    })));

    return inserts;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !categoryId) {
      toast.error("Compila nome e categoria");
      return;
    }
    if (teams.length < 2) {
      toast.error("Inserisci almeno 2 squadre");
      return;
    }

    const { data: phase, error: e1 } = await supabase.from("final_phases").insert({
      name: name.trim(),
      category_id: categoryId,
      mode,
      period_duration: periodDuration,
      total_periods: totalPeriods,
      has_triangolare: hasTriangolare,
      status: "active",
    }).select().single();

    if (e1 || !phase) { toast.error("Errore: " + (e1?.message || "")); return; }

    const teamRows = teams.map((t, i) => ({ phase_id: phase.id, team_name: t, seed_position: i }));
    const { error: e2 } = await supabase.from("final_phase_teams").insert(teamRows);
    if (e2) { toast.error("Errore squadre: " + e2.message); return; }

    const matchRows = generateBracket(phase.id, teams);
    const { error: e3 } = await supabase.from("final_phase_matches").insert(matchRows);
    if (e3) { toast.error("Errore tabellone: " + e3.message); return; }

    toast.success("Fase finale creata!");
    qc.invalidateQueries({ queryKey: ["final-phases"] });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuova Fase Finale</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Coppa Sibari 2026" className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>{categories.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Modalità</Label>
            <Select value={mode} onValueChange={(v: any) => { setMode(v); setTeams([]); }}>
              <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>{MODES.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Durata tempo (min)</Label>
              <Input type="number" min={1} value={periodDuration} onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 25)} className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Numero tempi</Label>
              <Input type="number" min={1} value={totalPeriods} onChange={(e) => setTotalPeriods(parseInt(e.target.value) || 2)} className="bg-muted/50" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="tri" checked={hasTriangolare} onCheckedChange={(c) => setHasTriangolare(!!c)} />
            <Label htmlFor="tri" className="cursor-pointer text-sm">Include triangolare (3°/4° posto)</Label>
          </div>

          <div className="space-y-2 border-t border-border/30 pt-3">
            <Label>Squadre ({teams.length}/{slotCount})</Label>
            <div className="flex gap-2">
              {opponentTeams.length > 0 ? (
                <Select value="" onValueChange={(v) => addTeam(v)}>
                  <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Aggiungi da rosa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Napoli Campania">Napoli Campania</SelectItem>
                    {opponentTeams.filter((t: any) => !teams.includes(t.name)).map((t: any) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="O scrivi nome" className="bg-muted/50" />
              <Button onClick={() => addTeam(newTeam)} size="icon" className="bg-primary"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1">
              {teams.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/30 rounded p-2">
                  <span className="text-sm"><span className="text-muted-foreground mr-2">#{i + 1}</span>{t}</span>
                  <Button onClick={() => removeTeam(i)} size="icon" variant="ghost" className="h-6 w-6"><X className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full bg-secondary text-secondary-foreground">Crea Fase Finale</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
