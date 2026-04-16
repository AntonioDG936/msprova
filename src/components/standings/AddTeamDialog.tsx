import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddTeamDialogProps {
  standingId: string;
  categoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  currentMaxPosition: number;
}

export const AddTeamDialog = ({ standingId, categoryId, open, onOpenChange, onAdded, currentMaxPosition }: AddTeamDialogProps) => {
  const [selectedTeam, setSelectedTeam] = useState("");

  const { data: teams = [] } = useQuery({
    queryKey: ["opponent-teams-for-standings", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase.from("opponent_teams").select("*").eq("category_id", categoryId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && open,
  });

  // Include "Napoli Campania" as an option
  const allTeams = [{ id: "napoli-campania", name: "Napoli Campania" }, ...teams];

  const handleSubmit = async () => {
    if (!selectedTeam) {
      toast.error("Seleziona una squadra");
      return;
    }

    const { error } = await supabase
      .from("standings_entries")
      .insert({
        standings_id: standingId,
        team_name: selectedTeam,
        position: currentMaxPosition + 1,
        points: 0, played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0,
      });

    if (error) { toast.error("Errore"); return; }

    toast.success("Squadra aggiunta");
    setSelectedTeam("");
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-card-foreground">
        <DialogHeader>
          <DialogTitle>Aggiungi Squadra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Seleziona squadra" />
            </SelectTrigger>
            <SelectContent>
              {allTeams.map((t) => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              <Plus className="w-4 h-4 mr-2" /> Aggiungi
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">Annulla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
