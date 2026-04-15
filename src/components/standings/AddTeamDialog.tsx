import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddTeamDialogProps {
  standingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  currentMaxPosition: number;
}

export const AddTeamDialog = ({ standingId, open, onOpenChange, onAdded, currentMaxPosition }: AddTeamDialogProps) => {
  const [teamName, setTeamName] = useState("");

  const handleSubmit = async () => {
    if (!teamName.trim()) {
      toast.error("Inserisci il nome della squadra");
      return;
    }

    const { error } = await supabase
      .from("standings_entries")
      .insert({
        standings_id: standingId,
        team_name: teamName.trim(),
        position: currentMaxPosition + 1,
        points: 0, played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0,
      });

    if (error) { toast.error("Errore"); return; }

    toast.success("Squadra aggiunta");
    setTeamName("");
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
          <div>
            <Label htmlFor="team">Nome Squadra</Label>
            <Input id="team" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Es. Juventus" className="bg-background border-border text-foreground" />
          </div>
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
