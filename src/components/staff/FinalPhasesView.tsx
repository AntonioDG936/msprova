import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trophy, Trash2, LayoutGrid, X } from "lucide-react";
import { toast } from "sonner";
import { FinalPhaseWizard } from "./FinalPhaseWizard";

interface Props { onBack: () => void; }

const ROUND_LABELS: Record<string, string> = {
  round_of_16: "Ottavi di Finale",
  quarters: "Quarti di Finale",
  semis: "Semifinali",
  final: "Finale",
  third_place: "Finale 3°/4° posto",
};

const ROUND_ORDER = ["round_of_16", "quarters", "semis", "final"];

export const FinalPhasesView = ({ onBack }: Props) => {
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const { data: phases = [] } = useQuery({
    queryKey: ["final-phases"],
    queryFn: async () => {
      const { data } = await supabase.from("final_phases").select("*, category:categories(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const deletePhase = async (id: string) => {
    if (!confirm("Eliminare questa fase finale e tutte le partite?")) return;
    // Elimina anche le partite reali collegate
    await supabase.from("matches").delete().eq("final_phase_id", id);
    await supabase.from("final_phase_matches").delete().eq("phase_id", id);
    await supabase.from("final_phase_teams").delete().eq("phase_id", id);
    await supabase.from("final_phases").delete().eq("id", id);
    toast.success("Fase eliminata");
    qc.invalidateQueries({ queryKey: ["final-phases"] });
    if (selectedPhase === id) setSelectedPhase(null);
  };

  if (selectedPhase) {
    return <PhaseView phaseId={selectedPhase} onBack={() => setSelectedPhase(null)} />;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fasi Finali</h1>
            <p className="text-accent text-sm">Tabelloni ad eliminazione</p>
          </div>
          <Button variant="outline" onClick={onBack} className="text-foreground border-primary/30">← Dashboard</Button>
        </div>

        <Button onClick={() => setWizardOpen(true)} className="mb-4 bg-secondary text-secondary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nuova Fase Finale
        </Button>

        {phases.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nessuna fase finale creata</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {phases.map((p: any) => (
              <Card key={p.id} className="bg-card/80 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-secondary" />{p.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{p.category?.name} · {ROUND_LABELS[p.mode] || p.mode}</p>
                      {p.winner_team && <p className="text-sm text-secondary font-semibold mt-1">🏆 {p.winner_team}</p>}
                    </div>
                    <Button onClick={() => deletePhase(p.id)} size="icon" variant="ghost" className="h-7 w-7 text-destructive-foreground">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button onClick={() => setSelectedPhase(p.id)} size="sm" className="w-full bg-primary mt-2">Apri</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <FinalPhaseWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      </div>
    </div>
  );
};

const PhaseView = ({ phaseId, onBack }: { phaseId: string; onBack: () => void }) => {
  const qc = useQueryClient();
  const [showBracket, setShowBracket] = useState(false);
  const [editPhaseMatch, setEditPhaseMatch] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: phase } = useQuery({
    queryKey: ["final-phase", phaseId],
    queryFn: async () => (await supabase.from("final_phases").select("*, category:categories(name)").eq("id", phaseId).single()).data,
  });

  const { data: phaseMatches = [], refetch } = useQuery({
    queryKey: ["final-phase-matches", phaseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("final_phase_matches")
        .select("*, match:matches!final_phase_matches_match_id_fkey(*, field:fields(*), mister:misters(*), category:categories(*))")
        .eq("phase_id", phaseId)
        .order("round")
        .order("slot");
      return data || [];
    },
  });

  // Quando una finale viene completata, mostra celebrazione fullscreen una volta
  useEffect(() => {
    if (phase?.winner_team && phase?.status === "completed") {
      setShowCelebration(true);
    }
  }, [phase?.winner_team, phase?.status]);

  if (showCelebration && phase?.winner_team) {
    return <CelebrationFullscreen winner={phase.winner_team} onClose={() => setShowCelebration(false)} />;
  }

  const rounds = ROUND_ORDER.filter(r => phaseMatches.some((m: any) => m.round === r));

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{phase?.name}</h1>
            <p className="text-xs text-muted-foreground">{phase?.category?.name}</p>
            {phase?.winner_team && <p className="text-secondary font-semibold">🏆 Vincitore: {phase.winner_team}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBracket(true)} className="text-foreground border-primary/30">
              <LayoutGrid className="w-4 h-4 mr-1" /> Tabellone
            </Button>
            <Button variant="outline" size="sm" onClick={onBack} className="text-foreground border-primary/30">← Indietro</Button>
          </div>
        </div>

        <div className="space-y-6">
          {rounds.map(round => (
            <div key={round}>
              <h3 className="font-bold text-foreground mb-2">{ROUND_LABELS[round]}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {phaseMatches.filter((m: any) => m.round === round).map((pm: any) => (
                  <PhaseMatchRow key={pm.id} pm={pm} onClick={() => setEditPhaseMatch(pm)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={showBracket} onOpenChange={setShowBracket}>
          <DialogContent className="bg-card border-border/50 text-foreground max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>Tabellone — {phase?.name}</DialogTitle></DialogHeader>
            <BracketView phaseMatches={phaseMatches} onSelectMatch={(pm) => { setShowBracket(false); setEditPhaseMatch(pm); }} />
          </DialogContent>
        </Dialog>

        {editPhaseMatch && (
          <PhaseMatchEditor
            phaseMatch={editPhaseMatch}
            phase={phase}
            allPhaseMatches={phaseMatches}
            open={!!editPhaseMatch}
            onClose={() => { setEditPhaseMatch(null); refetch(); qc.invalidateQueries({ queryKey: ["final-phase", phaseId] }); }}
          />
        )}
      </div>
    </div>
  );
};

const PhaseMatchRow = ({ pm, onClick }: { pm: any; onClick: () => void }) => {
  const m = pm.match;
  const home = pm.team_home || "TBD";
  const away = pm.team_away || "TBD";
  const hasResult = m && m.score_home !== null && m.score_away !== null;
  const winnerName = pm.winner;

  return (
    <button
      onClick={onClick}
      className="text-left bg-card/80 hover:bg-card border border-border/50 hover:border-primary/50 rounded-lg p-3 transition"
    >
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${winnerName === pm.team_home ? "text-secondary" : "text-foreground"}`}>{home}</span>
        {hasResult ? <span className="font-bold text-accent">{m.score_home}</span> : <span className="text-xs text-muted-foreground">—</span>}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className={`font-semibold ${winnerName === pm.team_away ? "text-secondary" : "text-foreground"}`}>{away}</span>
        {hasResult ? <span className="font-bold text-accent">{m.score_away}</span> : <span className="text-xs text-muted-foreground">—</span>}
      </div>
      {m && (
        <div className="text-xs text-muted-foreground mt-2">
          {m.match_date} · {m.match_time?.substring(0, 5)} {m.field?.name ? `· ${m.field.name}` : ""}
        </div>
      )}
      {!m && <div className="text-xs text-primary mt-2">Tocca per impostare la partita →</div>}
    </button>
  );
};

const BracketView = ({ phaseMatches, onSelectMatch }: { phaseMatches: any[]; onSelectMatch: (pm: any) => void }) => {
  const rounds = ROUND_ORDER.filter(r => phaseMatches.some((m: any) => m.round === r));
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {rounds.map(round => (
        <div key={round} className="flex-shrink-0 w-56 space-y-3">
          <h3 className="font-bold text-center text-foreground text-sm">{ROUND_LABELS[round]}</h3>
          <div className="flex flex-col justify-around h-full gap-3">
            {phaseMatches.filter((m: any) => m.round === round).map((pm: any) => {
              const m = pm.match;
              const hasResult = m && m.score_home !== null && m.score_away !== null;
              return (
                <button
                  key={pm.id}
                  onClick={() => onSelectMatch(pm)}
                  className="bg-card border border-border/50 hover:border-primary rounded p-2 text-left transition"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className={pm.winner === pm.team_home ? "text-secondary font-bold" : "text-foreground"}>
                      {pm.team_home || "TBD"}
                    </span>
                    {hasResult && <span className="font-bold">{m.score_home}</span>}
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className={pm.winner === pm.team_away ? "text-secondary font-bold" : "text-foreground"}>
                      {pm.team_away || "TBD"}
                    </span>
                    {hasResult && <span className="font-bold">{m.score_away}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const CelebrationFullscreen = ({ winner, onClose }: { winner: string; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center p-4 animate-in fade-in duration-500">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
        <X className="w-8 h-8" />
      </button>
      <div className="text-center text-white">
        <Trophy className="w-32 h-32 mx-auto mb-6 text-yellow-300 animate-bounce" />
        <p className="text-2xl font-semibold mb-2">🎉 CAMPIONE 🎉</p>
        <h1 className="text-5xl md:text-7xl font-extrabold drop-shadow-lg">{winner}</h1>
        <p className="text-xl mt-6 opacity-90">Complimenti per la vittoria!</p>
        <Button onClick={onClose} className="mt-8 bg-white text-primary hover:bg-white/90 font-bold">Chiudi</Button>
      </div>
    </div>
  );
};

// Editor partita: crea/edita una vera "matches" e collega via final_phase_match_id
const PhaseMatchEditor = ({ phaseMatch, phase, allPhaseMatches, open, onClose }: any) => {
  const m = phaseMatch.match;
  const [opponent, setOpponent] = useState(phaseMatch.team_away || "");
  const [homeTeam, setHomeTeam] = useState(phaseMatch.team_home || "");
  const [matchDate, setMatchDate] = useState(m?.match_date || "");
  const [matchTime, setMatchTime] = useState(m?.match_time?.substring(0, 5) || "");
  const [fieldId, setFieldId] = useState(m?.field_id || "");
  const [misterId, setMisterId] = useState(m?.mister_id || "");
  const [notes, setNotes] = useState(m?.notes || "");
  const [scoreHome, setScoreHome] = useState(m?.score_home?.toString() ?? "");
  const [scoreAway, setScoreAway] = useState(m?.score_away?.toString() ?? "");
  const [scoreHomePen, setScoreHomePen] = useState(m?.score_home_pen?.toString() ?? "");
  const [scoreAwayPen, setScoreAwayPen] = useState(m?.score_away_pen?.toString() ?? "");
  const [periodDuration, setPeriodDuration] = useState<number>(m?.period_duration ?? phase?.period_duration ?? 25);
  const [totalPeriods, setTotalPeriods] = useState<number>(m?.total_periods ?? phase?.total_periods ?? 2);

  const { data: fields = [] } = useQuery({ queryKey: ["fields"], queryFn: async () => (await supabase.from("fields").select("*").order("name")).data || [] });
  const { data: misters = [] } = useQuery({ queryKey: ["misters"], queryFn: async () => (await supabase.from("misters").select("*").order("last_name")).data || [] });
  const { data: phaseTeams = [] } = useQuery({
    queryKey: ["phase-teams", phase?.id],
    queryFn: async () => (await supabase.from("final_phase_teams").select("team_name").eq("phase_id", phase.id)).data || [],
    enabled: !!phase?.id,
  });
  const teamOptions: string[] = phaseTeams.map((t: any) => t.team_name);

  const isNapoli = (n: string) => n.toLowerCase().includes("napoli campania");

  const handleSave = async () => {
    if (!homeTeam.trim() || !opponent.trim() || !matchDate || !matchTime) {
      toast.error("Compila squadre, data e ora");
      return;
    }

    // is_other_teams = true se nessuna delle due squadre è Napoli Campania
    const isOther = !isNapoli(homeTeam) && !isNapoli(opponent);
    // opponent della tabella matches = "l'altra rispetto a Napoli", se Napoli c'è
    let matchOpponent = opponent.trim();
    let matchHomeTeam: string | null = homeTeam.trim();
    if (!isOther) {
      // Napoli è una delle due — opponent = l'altra
      if (isNapoli(homeTeam)) matchOpponent = opponent.trim();
      else matchOpponent = homeTeam.trim();
      matchHomeTeam = null;
    }

    const payload: any = {
      category_id: phase.category_id,
      mister_id: misterId || null,
      opponent: matchOpponent,
      home_team: matchHomeTeam,
      is_other_teams: isOther,
      napoli_is_home: isOther ? null : isNapoli(homeTeam),
      field_id: fieldId || null,
      match_date: matchDate,
      match_time: matchTime,
      notes: notes.trim() || null,
      period_duration: periodDuration,
      total_periods: totalPeriods,
      score_home: scoreHome !== "" ? parseInt(scoreHome) : null,
      score_away: scoreAway !== "" ? parseInt(scoreAway) : null,
      score_home_pen: scoreHomePen !== "" ? parseInt(scoreHomePen) : null,
      score_away_pen: scoreAwayPen !== "" ? parseInt(scoreAwayPen) : null,
      is_final_phase: true,
      final_phase_id: phase.id,
      final_phase_round: phaseMatch.round,
      final_phase_slot: phaseMatch.slot,
    };

    let matchId = m?.id;
    if (matchId) {
      const { error } = await supabase.from("matches").update(payload).eq("id", matchId);
      if (error) { toast.error("Errore: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("matches").insert(payload).select().single();
      if (error || !data) { toast.error("Errore: " + (error?.message || "")); return; }
      matchId = data.id;
    }

    // Vincitore: regular score, in caso di pareggio usa rigori
    let winner: string | null = phaseMatch.winner;
    if (scoreHome !== "" && scoreAway !== "") {
      const sh = parseInt(scoreHome), sa = parseInt(scoreAway);
      if (sh > sa) winner = homeTeam.trim();
      else if (sa > sh) winner = opponent.trim();
      else if (scoreHomePen !== "" && scoreAwayPen !== "") {
        const ph = parseInt(scoreHomePen), pa = parseInt(scoreAwayPen);
        if (ph > pa) winner = homeTeam.trim();
        else if (pa > ph) winner = opponent.trim();
      }
    }

    await supabase.from("final_phase_matches").update({
      match_id: matchId,
      team_home: homeTeam.trim(),
      team_away: opponent.trim(),
      winner,
    }).eq("id", phaseMatch.id);

    // Propaga winner al round successivo
    if (winner && winner !== phaseMatch.winner) {
      const idx = ROUND_ORDER.indexOf(phaseMatch.round);
      if (idx >= 0 && idx < ROUND_ORDER.length - 1) {
        const nextRound = ROUND_ORDER[idx + 1];
        const nextSlot = Math.floor(phaseMatch.slot / 2);
        const isHome = phaseMatch.slot % 2 === 0;
        const next = allPhaseMatches.find((x: any) => x.round === nextRound && x.slot === nextSlot);
        if (next) {
          await supabase.from("final_phase_matches").update(
            isHome ? { team_home: winner } : { team_away: winner }
          ).eq("id", next.id);
        }
      }
      if (phaseMatch.round === "final") {
        await supabase.from("final_phases").update({ winner_team: winner, status: "completed" }).eq("id", phase.id);
      }
    }

    toast.success("Partita salvata");
    onClose();
  };

  const handleDelete = async () => {
    if (!m?.id) return;
    if (!confirm("Eliminare la partita?")) return;
    await supabase.from("matches").delete().eq("id", m.id);
    await supabase.from("final_phase_matches").update({ match_id: null }).eq("id", phaseMatch.id);
    toast.success("Partita eliminata");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ROUND_LABELS[phaseMatch.round]} — Partita {phaseMatch.slot + 1}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Squadra A *</Label>
              <Input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} placeholder="Es. Napoli Campania" className="bg-muted/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Squadra B *</Label>
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mister (se Napoli Campania gioca)</Label>
            <Select value={misterId} onValueChange={setMisterId}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{misters.map((x: any) => (<SelectItem key={x.id} value={x.id}>{x.first_name} {x.last_name}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Campo</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger className="bg-muted/50"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{fields.map((f: any) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data *</Label>
              <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="bg-muted/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ora *</Label>
              <Input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="bg-muted/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Durata tempo (min)</Label>
              <Input type="number" min={1} value={periodDuration} onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 25)} className="bg-muted/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Numero tempi</Label>
              <Input type="number" min={1} value={totalPeriods} onChange={(e) => setTotalPeriods(parseInt(e.target.value) || 2)} className="bg-muted/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Gol {homeTeam || "A"}</Label>
              <Input type="number" value={scoreHome} onChange={(e) => setScoreHome(e.target.value)} className="bg-muted/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gol {opponent || "B"}</Label>
              <Input type="number" value={scoreAway} onChange={(e) => setScoreAway(e.target.value)} className="bg-muted/50" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-muted/50" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 bg-secondary text-secondary-foreground">Salva</Button>
            {m?.id && <Button onClick={handleDelete} variant="destructive">Elimina</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
