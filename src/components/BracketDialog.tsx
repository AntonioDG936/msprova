import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LayoutGrid } from "lucide-react";

const ROUND_LABELS: Record<string, string> = {
  round_of_16: "Ottavi",
  quarters: "Quarti",
  semis: "Semifinali",
  final: "Finale",
};
const ROUND_ORDER = ["round_of_16", "quarters", "semis", "final"];

export const BracketButton = ({ categoryName }: { categoryName?: string | null }) => {
  const [open, setOpen] = useState(false);

  const { data: phases = [] } = useQuery({
    queryKey: ["active-final-phases", categoryName],
    queryFn: async () => {
      let q = supabase
        .from("final_phases")
        .select("*, category:categories(name)")
        .neq("status", "draft");
      const { data } = await q;
      let result = data || [];
      if (categoryName) {
        result = result.filter((p: any) => p.category?.name === categoryName);
      }
      return result;
    },
    refetchInterval: 30000,
  });

  if (phases.length === 0) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="text-foreground border-secondary/50">
        <LayoutGrid className="w-4 h-4 mr-1" /> Tabellone
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 text-foreground max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Tabellone Fasi Finali</DialogTitle></DialogHeader>
          <div className="space-y-8">
            {phases.map((p: any) => (
              <PhaseBracket key={p.id} phase={p} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PhaseBracket = ({ phase }: { phase: any }) => {
  const { data: phaseMatches = [] } = useQuery({
    queryKey: ["final-phase-bracket", phase.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("final_phase_matches")
        .select("*, match:matches!final_phase_matches_match_id_fkey(score_home, score_away)")
        .eq("phase_id", phase.id)
        .order("round")
        .order("slot");
      return data || [];
    },
    refetchInterval: 15000,
  });

  const rounds = ROUND_ORDER.filter(r => phaseMatches.some((m: any) => m.round === r));

  return (
    <div>
      <h3 className="font-bold text-foreground mb-2">{phase.name} <span className="text-xs text-muted-foreground">· {phase.category?.name}</span></h3>
      {phase.winner_team && <p className="text-secondary font-semibold mb-2">🏆 {phase.winner_team}</p>}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {rounds.map(round => (
          <div key={round} className="flex-shrink-0 w-52 space-y-3">
            <h4 className="font-bold text-center text-foreground text-sm">{ROUND_LABELS[round]}</h4>
            <div className="flex flex-col gap-3">
              {phaseMatches.filter((m: any) => m.round === round).map((pm: any) => {
                const m = pm.match;
                const hasResult = m && m.score_home !== null && m.score_away !== null;
                return (
                  <div key={pm.id} className="bg-card border border-border/50 rounded p-2">
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
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
