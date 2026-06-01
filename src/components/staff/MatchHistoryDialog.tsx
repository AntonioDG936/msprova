import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";

interface MatchHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MatchHistoryDialog = ({ open, onOpenChange }: MatchHistoryDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["history-matches", selectedCategory, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      let query = supabase
        .from("matches")
        .select("*, category:categories(*), mister:misters(*), field:fields(*)")
        .eq("match_date", dateStr)
        .order("match_time");

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      query = query.order("is_other_teams", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Storico Partite</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-muted/50 text-foreground">
              <SelectValue placeholder="Tutte le categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col items-center space-y-4">
            <p className="text-accent">Seleziona una data per visualizzare le partite</p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn("rounded-md border border-border/50 bg-card/50 pointer-events-auto")}
              locale={it}
            />
          </div>

          {selectedDate && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">
                Partite del {format(selectedDate, "d MMMM yyyy", { locale: it })}
              </h3>
              {matches.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nessuna partita trovata</p>
              ) : (
                <div className="grid gap-4">
                  {matches.map((match: any) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      showCategory={true}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ["history-matches"] })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
