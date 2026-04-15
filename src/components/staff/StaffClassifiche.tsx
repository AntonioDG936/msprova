import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { AddTeamDialog } from "@/components/standings/AddTeamDialog";
import { Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StaffClassificheProps {
  onBack: () => void;
}

export const StaffClassifiche = ({ onBack }: StaffClassificheProps) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStanding, setSelectedStanding] = useState<string>("");
  const [isAddStandingOpen, setIsAddStandingOpen] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newChampionshipName, setNewChampionshipName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: standings = [] } = useQuery({
    queryKey: ["standings", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("standings")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("championship_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategory,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["standings-entries", selectedStanding],
    queryFn: async () => {
      if (!selectedStanding) return [];
      const { data, error } = await supabase
        .from("standings_entries")
        .select("*")
        .eq("standings_id", selectedStanding)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStanding,
  });

  const createStanding = async () => {
    if (!newChampionshipName.trim() || !selectedCategory) return;
    const { error } = await supabase.from("standings").insert({
      category_id: selectedCategory,
      championship_name: newChampionshipName.trim(),
    });
    if (error) { toast.error("Errore"); return; }
    toast.success("Campionato creato");
    setNewChampionshipName("");
    setIsAddStandingOpen(false);
    queryClient.invalidateQueries({ queryKey: ["standings"] });
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
          <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedStanding(""); }}>
            <SelectTrigger className="bg-card border-border text-foreground">
              <SelectValue placeholder="Seleziona categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCategory && (
            <div className="flex gap-2">
              <Select value={selectedStanding} onValueChange={setSelectedStanding}>
                <SelectTrigger className="flex-1 bg-card border-border text-foreground">
                  <SelectValue placeholder="Seleziona campionato" />
                </SelectTrigger>
                <SelectContent>
                  {standings.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.championship_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setIsAddStandingOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuovo
              </Button>
            </div>
          )}

          {selectedStanding && (
            <div className="space-y-4">
              <div className="flex justify-end">
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

        <Dialog open={isAddStandingOpen} onOpenChange={setIsAddStandingOpen}>
          <DialogContent className="bg-card border-border/50 text-card-foreground">
            <DialogHeader>
              <DialogTitle>Nuovo Campionato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome Campionato</Label>
                <Input value={newChampionshipName} onChange={(e) => setNewChampionshipName(e.target.value)} placeholder="Es. Torneo di Paestum 2026" className="bg-background border-border text-foreground" />
              </div>
              <div className="flex gap-2">
                <Button onClick={createStanding} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" /> Crea
                </Button>
                <Button onClick={() => setIsAddStandingOpen(false)} variant="outline" className="flex-1">Annulla</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AddTeamDialog
          standingId={selectedStanding}
          open={isAddTeamOpen}
          onOpenChange={setIsAddTeamOpen}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ["standings-entries"] })}
          currentMaxPosition={entries.length}
        />
      </div>
    </div>
  );
};
