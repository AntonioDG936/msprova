import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('bracket-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'final_phases' }, () => {
        qc.invalidateQueries({ queryKey: ["active-final-phases"] });
        qc.invalidateQueries({ queryKey: ["final-phase-bracket"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'final_phase_matches' }, () => {
        qc.invalidateQueries({ queryKey: ["final-phase-bracket"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const { data: phases = [] } = useQuery({
    queryKey: ["active-final-phases", categoryName],
    queryFn: async () => {
      const { data } = await supabase
        .from("final_phases")
        .select("*, category:categories(name)")
        .neq("status", "draft");
      let result = data || [];
      if (categoryName) {
        result = result.filter((p: any) => p.category?.name === categoryName);
      }
      return result;
    },
    refetchInterval: 15000,
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

const MatchBox = ({ pm, side = "left" }: { pm: any; side?: "left" | "right" }) => {
  const m = pm?.match;
  const hasResult = m && m.score_home !== null && m.score_away !== null;
  return (
    <div className="bg-muted/40 border border-border rounded p-2 w-32 sm:w-40 text-xs">
      <div className="flex justify-between items-center">
        <span className={`truncate ${pm?.winner === pm?.team_home ? "text-secondary font-bold" : "text-foreground"}`}>
          {pm?.team_home || "—"}
        </span>
        {hasResult && <span className="font-bold ml-1">{m.score_home}</span>}
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className={`truncate ${pm?.winner === pm?.team_away ? "text-secondary font-bold" : "text-foreground"}`}>
          {pm?.team_away || "—"}
        </span>
        {hasResult && <span className="font-bold ml-1">{m.score_away}</span>}
      </div>
      {m?.score_home_pen != null && m?.score_away_pen != null && (
        <div className="text-[10px] text-muted-foreground text-center mt-0.5">
          rig. {m.score_home_pen}-{m.score_away_pen}
        </div>
      )}
    </div>
  );
};

const PhaseBracket = ({ phase }: { phase: any }) => {
  const { data: phaseMatches = [] } = useQuery({
    queryKey: ["final-phase-bracket", phase.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("final_phase_matches")
        .select("*, match:matches!final_phase_matches_match_id_fkey(score_home, score_away, score_home_pen, score_away_pen)")
        .eq("phase_id", phase.id)
        .order("round")
        .order("slot");
      return data || [];
    },
    refetchInterval: 10000,
  });

  const get = (round: string, slot: number) => phaseMatches.find((m: any) => m.round === round && m.slot === slot);
  const hasOttavi = phaseMatches.some((m: any) => m.round === "round_of_16");
  const hasQuarti = phaseMatches.some((m: any) => m.round === "quarters");
  const hasSemi = phaseMatches.some((m: any) => m.round === "semis");

  const Column = ({ children, gap = "gap-3" }: any) => (
    <div className={`flex flex-col justify-around ${gap}`}>{children}</div>
  );
  const Connector = () => <div className="w-4 sm:w-6 border-t border-border self-center" />;

  const leftQuarti = hasQuarti ? [get("quarters", 0), get("quarters", 1)] : [];
  const rightQuarti = hasQuarti ? [get("quarters", 2), get("quarters", 3)] : [];
  const leftOttavi = hasOttavi ? [get("round_of_16", 0), get("round_of_16", 1), get("round_of_16", 2), get("round_of_16", 3)] : [];
  const rightOttavi = hasOttavi ? [get("round_of_16", 4), get("round_of_16", 5), get("round_of_16", 6), get("round_of_16", 7)] : [];
  const leftSemi = hasSemi ? get("semis", 0) : null;
  const rightSemi = hasSemi ? get("semis", 1) : null;
  const finalMatch = get("final", 0);

  return (
    <div>
      <h3 className="font-bold text-foreground mb-3">
        {phase.name} <span className="text-xs text-muted-foreground">· {phase.category?.name}</span>
      </h3>
      {phase.winner_team && <p className="text-secondary font-semibold mb-3">🏆 {phase.winner_team}</p>}

      <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto pb-4">
        {/* LEFT side */}
        {hasOttavi && (
          <>
            <Column gap="gap-2">{leftOttavi.map((pm, i) => <MatchBox key={i} pm={pm} />)}</Column>
            <Connector />
          </>
        )}
        {hasQuarti && (
          <>
            <Column gap="gap-12">{leftQuarti.map((pm, i) => <MatchBox key={i} pm={pm} />)}</Column>
            <Connector />
          </>
        )}
        {hasSemi && (
          <>
            <Column>
              <MatchBox pm={leftSemi} />
            </Column>
            <Connector />
          </>
        )}

        {/* CENTER: Final */}
        <div className="flex flex-col items-center mx-1 sm:mx-3">
          <span className="text-xs text-muted-foreground mb-1">Finale</span>
          <MatchBox pm={finalMatch} />
        </div>

        {/* RIGHT side */}
        {hasSemi && (
          <>
            <Connector />
            <Column>
              <MatchBox pm={rightSemi} />
            </Column>
          </>
        )}
        {hasQuarti && (
          <>
            <Connector />
            <Column gap="gap-12">{rightQuarti.map((pm, i) => <MatchBox key={i} pm={pm} />)}</Column>
          </>
        )}
        {hasOttavi && (
          <>
            <Connector />
            <Column gap="gap-2">{rightOttavi.map((pm, i) => <MatchBox key={i} pm={pm} />)}</Column>
          </>
        )}
      </div>
    </div>
  );
};
