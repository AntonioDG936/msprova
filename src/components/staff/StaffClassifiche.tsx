import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { AddTeamDialog } from "@/components/standings/AddTeamDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface StaffClassificheProps {
  onBack: () => void;
}

export const StaffClassifiche = ({ onBack }: StaffClassificheProps) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Auto-find or create standings for selected category (no name prompt — è un torneo)
  const { data: standing } = useQuery({
    queryKey: ["standing-for-category", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const cat = categories.find(c => c.id === selectedCategory);
      if (!cat) return null;

      const { data: existing } = await supabase
        .from("standings")
        .select("*")
        .eq("category_id", selectedCategory)
        .limit(1)
        .maybeSingle();

      if (existing) return existing;

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

  // Realtime: aggiorna le entries quando il trigger DB ricalcola
  useEffect(() => {
    if (!standingId) return;
    const channel = supabase
      .channel(`standings-${standingId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'standings_entries', filter: `standings_id=eq.${standingId}` },
        () => queryClient.invalidateQueries({ queryKey: ["standings-entries", standingId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [standingId, queryClient]);

  // Reset classifica: azzera tutti i punti/gol di tutte le squadre
  const handleResetConfirmed = async () => {
    if (!standingId) return;
    const { error } = await supabase
      .from("standings_entries")
      .update({
        points: 0, played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0,
      })
      .eq("standings_id", standingId);

    if (error) { toast.error("Errore nel reset"); return; }
    toast.success("Classifica resettata");
    queryClient.invalidateQueries({ queryKey: ["standings-entries", standingId] });
    setResetStep(0);
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
              <p className="text-xs text-muted-foreground italic">
                La classifica si aggiorna automaticamente dai risultati delle partite.
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button onClick={() => setIsAddTeamOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Squadra
                </Button>

                {/* Reset con DOPPIA conferma */}
                <AlertDialog open={resetStep === 1} onOpenChange={(o) => { if (!o) setResetStep(0); }}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" onClick={() => setResetStep(1)}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Reset Classifica
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione azzererà tutti i punti, gol e statistiche della classifica.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setResetStep(0)}>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => { e.preventDefault(); setResetStep(2); }}>
                        Continua
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={resetStep === 2} onOpenChange={(o) => { if (!o) setResetStep(0); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Conferma definitiva</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vuoi davvero resettare la classifica? Questa operazione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setResetStep(0)}>No, annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetConfirmed} className="bg-destructive text-destructive-foreground">
                        Sì, resetta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
