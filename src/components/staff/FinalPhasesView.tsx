import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FinalPhaseWizard } from "./FinalPhaseWizard";

interface Props { onBack: () => void; }

const ROUND_LABELS: Record<string, string> = {
  quarters: "Quarti di Finale",
  semis: "Semifinali",
  final: "Finale",
  third_place: "Finale 3°/4° posto",
};

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
    await supabase.from("final_phase_matches").delete().eq("phase_id", id);
    await supabase.from("final_phase_teams").delete().eq("phase_id", id);
    await supabase.from("final_phases").delete().eq("id", id);
    toast.success("Fase eliminata");
    qc.invalidateQueries({ queryKey: ["final-phases"] });
    if (selectedPhase === id) setSelectedPhase(null);
  };

  if (selectedPhase) {
    return <PhaseBracket phaseId={selectedPhase} onBack={() => setSelectedPhase(null)} />;
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
                  <Button onClick={() => setSelectedPhase(p.id)} size="sm" className="w-full bg-primary mt-2">Apri Tabellone</Button>
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

const PhaseBracket = ({ phaseId, onBack }: { phaseId: string; onBack: () => void }) => {
  const qc = useQueryClient();

  const { data: phase } = useQuery({
    queryKey: ["final-phase", phaseId],
    queryFn: async () => (await supabase.from("final_phases").select("*").eq("id", phaseId).single()).data,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["final-phase-matches", phaseId],
    queryFn: async () => {
      const { data } = await supabase.from("final_phase_matches").select("*").eq("phase_id", phaseId).order("round").order("slot");
      return data || [];
    },
  });

  const setWinner = async (m: any, winner: string) => {
    await supabase.from("final_phase_matches").update({ winner }).eq("id", m.id);

    // Propaga vincitore al round successivo
    const order = ["quarters", "semis", "final"];
    const nextRoundIdx = order.indexOf(m.round) + 1;
    if (nextRoundIdx > 0 && nextRoundIdx < order.length) {
      const nextRound = order[nextRoundIdx];
      const nextSlot = Math.floor(m.slot / 2);
      const isHome = m.slot % 2 === 0;
      const next = matches.find((x: any) => x.round === nextRound && x.slot === nextSlot);
      if (next) {
        await supabase.from("final_phase_matches").update(
          isHome ? { team_home: winner } : { team_away: winner }
        ).eq("id", next.id);
      }
    }

    if (m.round === "final") {
      await supabase.from("final_phases").update({ winner_team: winner, status: "completed" }).eq("id", phaseId);
    }

    qc.invalidateQueries({ queryKey: ["final-phase-matches", phaseId] });
    qc.invalidateQueries({ queryKey: ["final-phase", phaseId] });
    toast.success("Vincitore impostato");
  };

  const rounds = Array.from(new Set(matches.map((m: any) => m.round)));

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{phase?.name}</h1>
            {phase?.winner_team && <p className="text-secondary font-semibold">🏆 Vincitore: {phase.winner_team}</p>}
          </div>
          <Button variant="outline" onClick={onBack} className="text-foreground border-primary/30">← Indietro</Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {rounds.map((round) => (
            <div key={round} className="flex-shrink-0 w-64 space-y-3">
              <h3 className="font-bold text-center text-foreground">{ROUND_LABELS[round] || round}</h3>
              {matches.filter((m: any) => m.round === round).map((m: any) => (
                <Card key={m.id} className="bg-card/80 border-border/50">
                  <CardContent className="p-3 space-y-2">
                    <BracketSide
                      label={m.team_home || "TBD"}
                      winner={m.winner === m.team_home}
                      canPick={!!m.team_home && m.team_home !== "TBD" && !m.winner}
                      onPick={() => setWinner(m, m.team_home)}
                    />
                    <div className="text-center text-xs text-muted-foreground">vs</div>
                    <BracketSide
                      label={m.team_away || "TBD"}
                      winner={m.winner === m.team_away}
                      canPick={!!m.team_away && m.team_away !== "TBD" && !m.winner}
                      onPick={() => setWinner(m, m.team_away)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BracketSide = ({ label, winner, canPick, onPick }: { label: string; winner: boolean; canPick: boolean; onPick: () => void }) => (
  <button
    onClick={canPick ? onPick : undefined}
    disabled={!canPick}
    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
      winner ? "bg-secondary text-secondary-foreground font-bold" :
      canPick ? "bg-muted/50 hover:bg-muted text-foreground" : "bg-muted/20 text-muted-foreground"
    }`}
  >
    {label}
  </button>
);
