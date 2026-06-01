import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchCard } from "@/components/MatchCard";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MatchHistoryViewProps {
  onBack: () => void;
}

export const MatchHistoryView = ({ onBack }: MatchHistoryViewProps) => {
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
    queryKey: ["history-matches-view", selectedCategory, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      let query = supabase
        .from("matches")
        .select("*, category:categories(*), mister:misters(*), field:fields(*)")
        .eq("match_date", dateStr)
        .order("match_time");

      if (selectedCategory && selectedCategory !== "all") {
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Storico Partite</h1>
        </div>

        <div className="space-y-6">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-card border-border text-foreground">
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
            <p className="text-accent">Seleziona una data</p>
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
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ["history-matches-view"] })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
