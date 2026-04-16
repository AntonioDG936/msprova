import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, Trash2, Edit, FileText, Radio } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LiveMatchDashboard } from "@/components/matches/LiveMatchDashboard";

export const StaffMatchesView = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [editMatch, setEditMatch] = useState<any>(null);
  const [liveMatch, setLiveMatch] = useState<any>(null);

  const { data: matches = [] } = useQuery({
    queryKey: ["staff-matches", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, category:categories(*), mister:misters(*), field:fields(*)")
        .eq("match_date", selectedDate)
        .order("match_time");
      if (error) throw error;
      return data;
    },
  });

  const deleteMatch = async (id: string) => {
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Partita eliminata");
    queryClient.invalidateQueries({ queryKey: ["staff-matches"] });
  };

  return (
    <div className="space-y-4">
      <Input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-muted/50 text-foreground max-w-xs"
      />

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nessuna partita per questa data</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((match: any) => (
            <Card key={match.id} className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-base text-foreground">
                        Napoli Campania vs {match.opponent}
                      </h3>
                      <span className="text-sm font-bold text-primary ml-2">
                        {match.category?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  <Button onClick={() => setLiveMatch(match)} size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Radio className="w-3 h-3 mr-1" />
                    LIVE
                  </Button>
                  <Button onClick={() => setEditMatch(match)} size="icon" variant="ghost" className="text-primary hover:bg-primary/20 h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => deleteMatch(match.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20 h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" /><span>{match.match_time.substring(0, 5)}</span>
                  </div>
                  {match.mister && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" /><span>{match.mister.first_name} {match.mister.last_name}</span>
                    </div>
                  )}
                  {match.field && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" /><span>{match.field.name}</span>
                    </div>
                  )}
                  {match.notes && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" /><span>{match.notes}</span>
                    </div>
                  )}
                  {match.status === "in_progress" && (
                    <div className="flex items-center gap-2 text-secondary font-semibold">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      <span>
                        {match.is_interval
                          ? "INTERVALLO"
                          : `${(match.current_minute ?? 0).toString().padStart(2, '0')}:${(match.current_second ?? 0).toString().padStart(2, '0')} - T${match.current_period ?? 1}`}
                      </span>
                    </div>
                  )}
                  {match.score_home !== null && (
                    <div className="text-accent font-bold text-lg mt-2">
                      {match.score_home} - {match.score_away}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editMatch && (
        <EditMatchDialog match={editMatch} open={!!editMatch} onOpenChange={(o) => { if (!o) setEditMatch(null); }} />
      )}

      {liveMatch && (
        <LiveMatchDashboard
          match={liveMatch}
          open={!!liveMatch}
          onOpenChange={(o) => { if (!o) setLiveMatch(null); }}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["staff-matches"] })}
        />
      )}
    </div>
  );
};

const EditMatchDialog = ({ match, open, onOpenChange }: { match: any; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const queryClient = useQueryClient();
  const [opponent, setOpponent] = useState(match.opponent);
  const [matchDate, setMatchDate] = useState(match.match_date);
  const [matchTime, setMatchTime] = useState(match.match_time.substring(0, 5));
  const [notes, setNotes] = useState(match.notes || "");
  const [scoreHome, setScoreHome] = useState(match.score_home?.toString() || "");
  const [scoreAway, setScoreAway] = useState(match.score_away?.toString() || "");
  const [categoryId, setCategoryId] = useState(match.category_id);
  const [misterId, setMisterId] = useState(match.mister_id || "");
  const [fieldId, setFieldId] = useState(match.field_id || "");

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => { const { data } = await supabase.from("categories").select("*").order("sort_order"); return data || []; } });
  const { data: misters = [] } = useQuery({ queryKey: ["misters"], queryFn: async () => { const { data } = await supabase.from("misters").select("*").order("last_name"); return data || []; } });
  const { data: fields = [] } = useQuery({ queryKey: ["fields"], queryFn: async () => { const { data } = await supabase.from("fields").select("*").order("name"); return data || []; } });

  const handleSave = async () => {
    const { error } = await supabase.from("matches").update({
      opponent, match_date: matchDate, match_time: matchTime, notes: notes || null,
      score_home: scoreHome ? parseInt(scoreHome) : null,
      score_away: scoreAway ? parseInt(scoreAway) : null,
      category_id: categoryId, mister_id: misterId || null, field_id: fieldId || null,
    }).eq("id", match.id);

    if (error) { toast.error("Errore"); return; }
    toast.success("Partita aggiornata");
    queryClient.invalidateQueries({ queryKey: ["staff-matches"] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">Modifica Partita</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Mister</Label>
            <Select value={misterId} onValueChange={setMisterId}>
              <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{misters.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Avversario</Label>
            <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} className="bg-muted/50 text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Campo</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{fields.map((f: any) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Data</Label>
              <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="bg-muted/50 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Ora</Label>
              <Input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="bg-muted/50 text-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Gol Casa</Label>
              <Input type="number" value={scoreHome} onChange={(e) => setScoreHome(e.target.value)} className="bg-muted/50 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Gol Ospiti</Label>
              <Input type="number" value={scoreAway} onChange={(e) => setScoreAway(e.target.value)} className="bg-muted/50 text-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-muted/50 text-foreground" />
          </div>
          <Button onClick={handleSave} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">Salva</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
