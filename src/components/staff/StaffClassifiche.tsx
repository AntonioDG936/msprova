import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { AddTeamDialog } from "@/components/standings/AddTeamDialog";
import { Plus, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StaffClassificheProps {
  onBack: () => void;
}

export const StaffClassifiche = ({ onBack }: StaffClassificheProps) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Auto-find or create standings for selected category
  const { data: standing } = useQuery({
    queryKey: ["standing-for-category", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const cat = categories.find(c => c.id === selectedCategory);
      if (!cat) return null;

      // Check existing
      const { data: existing } = await supabase
        .from("standings")
        .select("*")
        .eq("category_id", selectedCategory)
        .limit(1)
        .maybeSingle();

      if (existing) return existing;

      // Auto-create
      const { data: created, error } = await supabase
        .from("standings")
        .insert({ category_id: selectedCategory, championship_name: `Torneo ${cat.name}` })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    enabled: !!selectedCategory && categories.length > 0,
  });

  const standingId = standing?.id || "";

  const { data: entries = [] } = useQuery({
    queryKey: ["standings-entries", standingId],
    queryFn: async () => {
      if (!standingId) return [];
      const { data, error } = await supabase
        .from("standings_entries")
        .select("*")
        .eq("standings_id", standingId)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!standingId,
  });

  // Auto-calculate standings from completed matches
  const recalculate = async () => {
    if (!standingId || !selectedCategory) return;

    // Get all completed matches for this category
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("category_id", selectedCategory)
      .eq("status", "completed");

    if (!matches) return;

    // Build stats per team
    const stats: Record<string, { played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; points: number }> = {};

    // Initialize from existing entries
    for (const entry of entries) {
      stats[entry.team_name] = { played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };
    }

    // Ensure Napoli Campania exists
    if (!stats["Napoli Campania"]) {
      stats["Napoli Campania"] = { played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };
    }

    for (const m of matches) {
      if (m.score_home === null || m.score_away === null) continue;
      const home = "Napoli Campania";
      const away = m.opponent;

      if (!stats[home]) stats[home] = { played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };
      if (!stats[away]) stats[away] = { played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };

      stats[home].played++;
      stats[away].played++;
      stats[home].goals_for += m.score_home;
      stats[home].goals_against += m.score_away;
      stats[away].goals_for += m.score_away;
      stats[away].goals_against += m.score_home;

      if (m.score_home > m.score_away) {
        stats[home].won++; stats[home].points += 3;
        stats[away].lost++;
      } else if (m.score_home < m.score_away) {
        stats[away].won++; stats[away].points += 3;
        stats[home].lost++;
      } else {
        stats[home].drawn++; stats[home].points += 1;
        stats[away].drawn++; stats[away].points += 1;
      }
    }

    // Sort by points, then goal difference
    const sorted = Object.entries(stats).sort(([, a], [, b]) => {
      const diffA = a.goals_for - a.goals_against;
      const diffB = b.goals_for - b.goals_against;
      if (b.points !== a.points) return b.points - a.points;
      return diffB - diffA;
    });

    // Delete old entries and re-insert
    await supabase.from("standings_entries").delete().eq("standings_id", standingId);

    const newEntries = sorted.map(([team, s], i) => ({
      standings_id: standingId,
      team_name: team,
      position: i + 1,
      points: s.points,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goals_for: s.goals_for,
      goals_against: s.goals_against,
      goal_difference: s.goals_for - s.goals_against,
    }));

    if (newEntries.length > 0) {
      await supabase.from("standings_entries").insert(newEntries);
    }

    toast.success("Classifica ricalcolata");
    queryClient.invalidateQueries({ queryKey: ["standings-entries"] });
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Gestione Classifiche</h1>
        </div>

        <div className="space-y-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-card border-border text-foreground">
              <SelectValue placeholder="Seleziona categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {standingId && (
            <div className="space-y-4">
              <div className="flex gap-2 justify-end">
                <Button onClick={recalculate} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" /> Ricalcola da Partite
                </Button>
                <Button onClick={() => setIsAddTeamOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Squadra
                </Button>
              </div>
              <StandingsTable
                entries={entries}
                canEdit={true}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ["standings-entries"] })}
              />
            </div>
          )}
        </div>

        <AddTeamDialog
          standingId={standingId}
          categoryId={selectedCategory}
          open={isAddTeamOpen}
          onOpenChange={setIsAddTeamOpen}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ["standings-entries"] })}
          currentMaxPosition={entries.length}
        />
      </div>
    </div>
  );
};
