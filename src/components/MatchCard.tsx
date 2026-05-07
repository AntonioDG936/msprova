import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Clock, MapPin, User, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MatchDetailDialog } from "@/components/matches/MatchDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useLiveTime } from "@/lib/liveTimer";

interface MatchCardProps {
  match: {
    id: string;
    opponent: string;
    home_team?: string | null;
    is_other_teams?: boolean | null;
    napoli_is_home?: boolean | null;
    match_date: string;
    match_time: string;
    score_home: number | null;
    score_away: number | null;
    score_home_pen?: number | null;
    score_away_pen?: number | null;
    notes: string | null;
    status?: string;
    current_minute?: number | null;
    current_second?: number | null;
    current_period?: number | null;
    is_interval?: boolean | null;
    period_duration?: number | null;
    stoppage_minutes?: number | null;
    match_start_time?: string | null;
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

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  useEffect(() => {
    const channel = supabase
      .channel(`match-${match.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` }, (payload) => {
        setMatch(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [match.id]);

  const hasResult = match.score_home !== null && match.score_away !== null;
  const isLive = match.status === "in_progress";
  const periodDuration = match.period_duration ?? 25;

  // Tick ogni secondo: usa l'hook che calcola da match_start_time
  const live = useLiveTime(match);

  const napoliAway = !match.is_other_teams && match.napoli_is_home === false;
  const homeName = match.is_other_teams ? (match.home_team || "Casa") : (napoliAway ? match.opponent : "Napoli Campania");
  const awayName = match.is_other_teams ? match.opponent : (napoliAway ? "Napoli Campania" : match.opponent);

  const renderLiveTime = () => {
    if (match.is_interval) return <span>INTERVALLO</span>;
    if (live.isStoppage) {
      return (
        <span className="flex items-center gap-1.5">
          <span>
            {periodDuration}' +{live.stoppageMinute.toString().padStart(2, '0')}:{live.stoppageSecond.toString().padStart(2, '0')}
          </span>
          {match.stoppage_minutes != null && match.stoppage_minutes > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.4rem] px-1.5 rounded-full bg-stoppage text-stoppage-foreground text-xs font-bold leading-none">
              {match.stoppage_minutes}
            </span>
          )}
        </span>
      );
    }
    return (
      <span>
        {live.minute.toString().padStart(2, '0')}:{live.second.toString().padStart(2, '0')} - T{match.current_period ?? 1}
      </span>
    );
  };

  return (
    <>
      <Card
        onClick={() => setIsDetailOpen(true)}
        className="cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all hover:shadow-[var(--shadow-glow)]"
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3 gap-2">
            <h3 className="font-bold text-base text-foreground flex-1">
              {homeName} vs {awayName}
            </h3>
            {showCategory && match.category && (
              <span className="text-sm font-bold text-accent ml-2 whitespace-nowrap">
                {match.category.name}
              </span>
            )}
          </div>

          {isLive && (
            <div className="flex items-center gap-2 mb-2 text-secondary font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              {renderLiveTime()}
            </div>
          )}

          {hasResult && (
            <div className="text-xl font-bold text-accent mb-2">
              {match.score_home} - {match.score_away}
              {match.score_home_pen != null && match.score_away_pen != null && (
                <span className="text-sm font-semibold ml-2 text-muted-foreground">
                  (rig. {match.score_home_pen}-{match.score_away_pen})
                </span>
              )}
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
            {match.mister && !match.is_other_teams && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{match.mister.first_name} {match.mister.last_name}</span>
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
