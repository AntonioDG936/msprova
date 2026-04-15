import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { ArrowLeft } from "lucide-react";

interface StandingsViewProps {
  onBack: () => void;
}

export const StandingsView = ({ onBack }: StandingsViewProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStanding, setSelectedStanding] = useState<string>("");

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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Classifiche</h1>
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

          {selectedCategory && standings.length > 0 && (
            <Select value={selectedStanding} onValueChange={setSelectedStanding}>
              <SelectTrigger className="bg-card border-border text-foreground">
                <SelectValue placeholder="Seleziona campionato" />
              </SelectTrigger>
              <SelectContent>
                {standings.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.championship_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedStanding && (
            <StandingsTable entries={entries} canEdit={false} onUpdate={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
};
