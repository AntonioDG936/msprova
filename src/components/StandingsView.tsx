import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { ArrowLeft } from "lucide-react";

interface StandingsViewProps {
  onBack: () => void;
  defaultCategory?: string; // category name
}

export const StandingsView = ({ onBack, defaultCategory }: StandingsViewProps) => {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const categoryId = defaultCategory
    ? categories.find(c => c.name === defaultCategory)?.id || ""
    : "";

  const { data: standing } = useQuery({
    queryKey: ["standing-for-view", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const { data } = await supabase
        .from("standings")
        .select("*")
        .eq("category_id", categoryId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!categoryId,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["standings-entries", standing?.id],
    queryFn: async () => {
      if (!standing?.id) return [];
      const { data, error } = await supabase
        .from("standings_entries")
        .select("*")
        .eq("standings_id", standing.id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!standing?.id,
  });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            Classifica {defaultCategory || ""}
          </h1>
        </div>

        {entries.length > 0 ? (
          <StandingsTable entries={entries} canEdit={false} onUpdate={() => {}} />
        ) : (
          <p className="text-muted-foreground text-center py-8">Nessuna classifica disponibile per questa categoria</p>
        )}
      </div>
    </div>
  );
};
