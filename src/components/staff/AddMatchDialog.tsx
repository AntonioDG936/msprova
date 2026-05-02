import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface AddMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIsOtherTeams?: boolean;
}

export const AddMatchDialog = ({ open, onOpenChange, defaultIsOtherTeams = false }: AddMatchDialogProps) => {
  const queryClient = useQueryClient();
  const [isOtherTeams, setIsOtherTeams] = useState(defaultIsOtherTeams);
  const [categoryId, setCategoryId] = useState("");
  const [misterId, setMisterId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [notes, setNotes] = useState("");
  const [periodDuration, setPeriodDuration] = useState<number | "">("");
  const [totalPeriods, setTotalPeriods] = useState<number | "">("");

  useEffect(() => {
    if (open) setIsOtherTeams(defaultIsOtherTeams);
  }, [open, defaultIsOtherTeams]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: misters = [] } = useQuery({
    queryKey: ["misters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("misters").select("*").order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["fields"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fields").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: opponentTeams = [] } = useQuery({
    queryKey: ["opponent-teams", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase.from("opponent_teams").select("*").eq("category_id", categoryId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  // Carica i default tempi della categoria
  useEffect(() => {
    if (!categoryId) return;
    const cat = categories.find((c: any) => c.id === categoryId);
    if (cat) {
      setPeriodDuration(cat.default_period_duration ?? 25);
      setTotalPeriods(cat.default_total_periods ?? 2);
    }
  }, [categoryId, categories]);

  const reset = () => {
    setCategoryId(""); setMisterId(""); setOpponent(""); setHomeTeam("");
    setFieldId(""); setMatchDate(""); setMatchTime(""); setNotes("");
    setPeriodDuration(""); setTotalPeriods(""); setIsOtherTeams(false);
  };

  const handleSubmit = async () => {
    if (!categoryId || !matchDate || !matchTime) {
      toast.error("Compila Categoria, Data e Ora");
      return;
    }

    if (isOtherTeams) {
      if (!homeTeam.trim() || !opponent.trim()) {
        toast.error("Inserisci entrambe le squadre");
        return;
      }
    } else {
      if (!opponent.trim()) {
        toast.error("Inserisci la squadra avversaria");
        return;
      }
    }

    const { error } = await supabase.from("matches").insert({
      category_id: categoryId,
      mister_id: isOtherTeams ? null : (misterId || null),
      opponent: opponent.trim(),
      home_team: isOtherTeams ? homeTeam.trim() : null,
      is_other_teams: isOtherTeams,
      field_id: fieldId || null,
      match_date: matchDate,
      match_time: matchTime,
      notes: notes.trim() || null,
      period_duration: typeof periodDuration === "number" ? periodDuration : 25,
      total_periods: typeof totalPeriods === "number" ? totalPeriods : 2,
    });

    if (error) {
      console.error("[AddMatch] insert error:", error);
      toast.error(`Errore: ${error.message}`);
      return;
    }

    toast.success("Partita creata!");
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["staff-matches"] });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Aggiungi Partita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Spunta ALTRE SQUADRE */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="otherTeams"
              checked={isOtherTeams}
              onCheckedChange={(c) => setIsOtherTeams(!!c)}
            />
            <Label htmlFor="otherTeams" className="text-foreground cursor-pointer font-semibold">
              ALTRE SQUADRE (partita senza Napoli Campania)
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Categoria *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {!isOtherTeams && (
            <div className="space-y-2">
              <Label className="text-foreground">Mister</Label>
              <Select value={misterId} onValueChange={setMisterId}>
                <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {misters.map((m) => (<SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isOtherTeams && (
            <div className="space-y-2">
              <Label className="text-foreground">Squadra di casa *</Label>
              {opponentTeams.length > 0 ? (
                <Select value={homeTeam} onValueChange={setHomeTeam}>
                  <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    {opponentTeams.map((t) => (<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="bg-muted/50 text-foreground" placeholder="Nome squadra casa" />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-foreground">{isOtherTeams ? "Squadra ospite *" : "Squadra avversaria *"}</Label>
            {opponentTeams.length > 0 ? (
              <Select value={opponent} onValueChange={setOpponent}>
                <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {opponentTeams.filter((t) => t.name !== homeTeam).map((t) => (<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} className="bg-muted/50 text-foreground" placeholder="Nome squadra" />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Campo</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Data *</Label>
              <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="bg-muted/50 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Ora *</Label>
              <Input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="bg-muted/50 text-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground text-xs">Durata tempo (min)</Label>
              <Input type="number" min="1" value={periodDuration} onChange={(e) => setPeriodDuration(e.target.value ? parseInt(e.target.value) : "")} className="bg-muted/50 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-xs">Numero tempi</Label>
              <Input type="number" min="1" value={totalPeriods} onChange={(e) => setTotalPeriods(e.target.value ? parseInt(e.target.value) : "")} className="bg-muted/50 text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-muted/50 text-foreground" />
          </div>

          <Button onClick={handleSubmit} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            Crea Partita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
