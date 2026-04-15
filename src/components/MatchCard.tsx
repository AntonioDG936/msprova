import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Clock, MapPin, User, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MatchDetailDialog } from "@/components/matches/MatchDetailDialog";
import { supabase } from "@/integrations/supabase/client";

interface MatchCardProps {
  match: {
    id: string;
    opponent: string;
    match_date: string;
    match_time: string;
    score_home: number | null;
    score_away: number | null;
    notes: string | null;
    status?: string;
    current_minute?: number | null;
    current_second?: number | null;
    current_period?: number | null;
    is_interval?: boolean | null;
    category?: { name: string } | null;
    category_id?: string;
    mister?: { first_name: string; last_name: string } | null;
    field?: { name: string; google_maps_url: string | null } | null;
  };
  showCategory?: boolean;
  onUpdate?: () => void;
}

export const MatchCard = ({ match: initialMatch, showCategory = false, onUpdate }: MatchCardProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [match, setMatch] = useState(initialMatch);

  // Update when prop changes
  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          setMatch(prev => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  const hasResult = match.score_home !== null && match.score_away !== null;
  const isLive = match.status === "in_progress";

  return (
    <>
      <Card
        onClick={() => setIsDetailOpen(true)}
        className="cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all hover:shadow-[var(--shadow-glow)]"
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-base text-foreground flex-1">
              Napoli Campania vs {match.opponent}
            </h3>
            {showCategory && match.category && (
              <span className="text-sm font-bold text-primary ml-3 whitespace-nowrap">
                {match.category.name}
              </span>
            )}
          </div>

          {/* Live indicator */}
          {isLive && (
            <div className="flex items-center gap-2 mb-2 text-secondary font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>
                {match.is_interval
                  ? "INTERVALLO"
                  : `${(match.current_minute ?? 0).toString().padStart(2, '0')}:${(match.current_second ?? 0).toString().padStart(2, '0')} - T${match.current_period ?? 1}`}
              </span>
            </div>
          )}

          {hasResult && (
            <div className="text-xl font-bold text-accent mb-2">
              {match.score_home} - {match.score_away}
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(match.match_date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: it })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{match.match_time.substring(0, 5)}</span>
            </div>
            {match.mister && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  {match.mister.first_name} {match.mister.last_name}
                </span>
              </div>
            )}
            {match.field && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{match.field.name}</span>
              </div>
            )}
            {match.notes && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{match.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MatchDetailDialog
        match={match}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={onUpdate}
      />
    </>
  );
};
