import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GripVertical, Edit, Check } from "lucide-react";

interface StandingEntry {
  id: string;
  standings_id: string;
  team_name: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  created_at: string;
}

interface StandingsTableProps {
  entries: StandingEntry[];
  canEdit: boolean;
  onUpdate: () => void;
}

export const StandingsTable = ({ entries, canEdit, onUpdate }: StandingsTableProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntries, setEditingEntries] = useState<StandingEntry[]>([]);

  const startEdit = () => {
    setIsEditMode(true);
    setEditingEntries([...entries]);
  };

  const saveChanges = async () => {
    try {
      // Auto-sort by points then goal difference
      const sorted = [...editingEntries].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goal_difference - a.goal_difference;
      });

      const updates = sorted.map((entry, index) => ({
        ...entry,
        position: index + 1,
      }));

      for (const entry of updates) {
        const { error } = await supabase
          .from("standings_entries")
          .update({
            position: entry.position,
            points: entry.points,
            played: entry.played,
            won: entry.won,
            drawn: entry.drawn,
            lost: entry.lost,
            goals_for: entry.goals_for,
            goals_against: entry.goals_against,
            goal_difference: entry.goal_difference,
          })
          .eq("id", entry.id);

        if (error) throw error;
      }

      toast.success("Modifiche salvate");
      setIsEditMode(false);
      onUpdate();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    }
  };

  const updateEntry = (index: number, field: keyof StandingEntry, value: number) => {
    const updated = [...editingEntries];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "goals_for" || field === "goals_against") {
      updated[index].goal_difference = updated[index].goals_for - updated[index].goals_against;
    }

    setEditingEntries(updated);
  };

  const displayEntries = isEditMode ? editingEntries : entries;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          {!isEditMode ? (
            <Button onClick={startEdit} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Modifica
            </Button>
          ) : (
            <Button onClick={saveChanges}>
              <Check className="w-4 h-4 mr-2" />
              Salva
            </Button>
          )}
        </div>
      )}

      <div className="bg-card rounded-lg overflow-hidden border border-border overflow-x-auto">
        <div className="grid grid-cols-[35px_1fr_38px_38px_38px_38px_38px_38px_38px_45px] gap-0.5 px-2 py-2 bg-muted font-semibold text-xs">
          <div className="text-center flex items-center justify-center">#</div>
          <div className="flex items-center px-1">Squadra</div>
          <div className="text-center flex items-center justify-center">Pt</div>
          <div className="text-center flex items-center justify-center">G</div>
          <div className="text-center flex items-center justify-center">V</div>
          <div className="text-center flex items-center justify-center">N</div>
          <div className="text-center flex items-center justify-center">P</div>
          <div className="text-center flex items-center justify-center">GF</div>
          <div className="text-center flex items-center justify-center">GS</div>
          <div className="text-center flex items-center justify-center">DR</div>
        </div>

        {displayEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`grid grid-cols-[35px_1fr_38px_38px_38px_38px_38px_38px_38px_45px] gap-0.5 px-2 py-2 border-t border-border`}
          >
            <div className="flex items-center justify-center">
              <span className="text-xs">{index + 1}</span>
            </div>
            <div className="font-medium px-1 text-xs flex items-center">{entry.team_name}</div>

            {isEditMode ? (
              <>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.points} onChange={(e) => updateEntry(index, "points", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.played} onChange={(e) => updateEntry(index, "played", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.won} onChange={(e) => updateEntry(index, "won", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.drawn} onChange={(e) => updateEntry(index, "drawn", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.lost} onChange={(e) => updateEntry(index, "lost", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.goals_for} onChange={(e) => updateEntry(index, "goals_for", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center">
                  <Input type="number" value={entry.goals_against} onChange={(e) => updateEntry(index, "goals_against", parseInt(e.target.value) || 0)} className="w-full h-6 text-center p-0 text-xs" />
                </div>
                <div className="flex items-center justify-center text-xs">
                  {entry.goal_difference > 0 ? `+${entry.goal_difference}` : entry.goal_difference}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center text-xs">{entry.points}</div>
                <div className="flex items-center justify-center text-xs">{entry.played}</div>
                <div className="flex items-center justify-center text-xs">{entry.won}</div>
                <div className="flex items-center justify-center text-xs">{entry.drawn}</div>
                <div className="flex items-center justify-center text-xs">{entry.lost}</div>
                <div className="flex items-center justify-center text-xs">{entry.goals_for}</div>
                <div className="flex items-center justify-center text-xs">{entry.goals_against}</div>
                <div className="flex items-center justify-center text-xs">
                  {entry.goal_difference > 0 ? `+${entry.goal_difference}` : entry.goal_difference}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
