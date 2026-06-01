import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useLiveTime } from "@/lib/liveTimer";
import { resolveField, GROUP_MAP } from "@/lib/fieldsRegistry";
import { resolveMatchTeams } from "@/lib/matchTeams";

interface MatchDetailDialogProps {
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
    mister?: { first_name: string; last_name: string } | null;
    field?: { name: string; google_maps_url: string | null } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export const MatchDetailDialog = ({ match, open, onOpenChange }: MatchDetailDialogProps) => {
  const [isMapZoomed, setIsMapZoomed] = useState(false);
  const hasResult = match.score_home !== null && match.score_away !== null;
  const isLive = match.status === "in_progress";
  const periodDuration = match.period_duration ?? 25;
  const { homeName, awayName } = resolveMatchTeams(match);

  const live = useLiveTime(match);

  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ["match-events", match.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_events")
        .select("*")
        .eq("match_id", match.id)
        .order("period")
        .order("minute")
        .order("second");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Realtime events
  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`match-events-${match.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${match.id}` }, () => {
        refetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [match.id, open, refetchEvents]);

  const formatEventTime = (event: any) => {
    const period = event.period ?? 1;
    if (event.minute >= periodDuration) {
      const extra = event.minute - periodDuration + 1;
      return `${period * periodDuration}'+${extra}'`;
    }
    const cumMinute = (period - 1) * periodDuration + event.minute;
    return `${cumMinute + 1}'`;
  };

  const fieldInfo = resolveField(match.field?.name, match.field?.google_maps_url);
  const mapImage = fieldInfo ? GROUP_MAP[fieldInfo.group] : null;
  const openUrl = fieldInfo?.mapsUrl || match.field?.google_maps_url || "";

  const renderLiveTime = () => {
    if (match.is_interval) return <span>INTERVALLO</span>;
    if (live.isStoppage) {
      return (
        <span className="flex items-center gap-2">
          <span>
            {periodDuration}' +{live.stoppageMinute.toString().padStart(2, '0')}:{live.stoppageSecond.toString().padStart(2, '0')}
          </span>
          {match.stoppage_minutes != null && match.stoppage_minutes > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.6rem] h-[1.6rem] px-2 rounded-full bg-stoppage text-stoppage-foreground text-sm font-bold leading-none">
              {match.stoppage_minutes}
            </span>
          )}
        </span>
      );
    }
    return (
      <span>
        {live.minute.toString().padStart(2, '0')}:{live.second.toString().padStart(2, '0')} - Tempo {match.current_period ?? 1}
      </span>
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-card-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Dettagli Partita</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Teams and Score */}
          <div className="text-center">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{homeName}</h3>
              </div>
              <div className="text-center">
                <div className="px-4 py-3 rounded-lg bg-muted">
                  <span className="text-2xl font-bold text-foreground">
                    {hasResult ? `${match.score_home} - ${match.score_away}` : "- -"}
                  </span>
                </div>
                {match.score_home_pen != null && match.score_away_pen != null && (
                  <div className="text-sm text-muted-foreground mt-1 font-semibold">
                    Rigori: {match.score_home_pen} - {match.score_away_pen}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{awayName}</h3>
              </div>
            </div>

            {isLive && (
              <div className="flex items-center justify-center gap-2 mb-4 text-primary font-semibold">
                <Clock className="w-5 h-5" />
                <span className="text-lg">{renderLiveTime()}</span>
              </div>
            )}

            {match.category && (
              <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded text-sm font-semibold">
                {match.category.name}
              </span>
            )}
          </div>

          {/* Events */}
          {events.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground/80 mb-2">Eventi Partita</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground text-center mb-1">{homeName}</p>
                  {events.filter(e => e.team === "home").map(event => (
                    <div key={event.id} className="flex items-center gap-2 bg-muted/30 rounded p-2 text-sm">
                      <span className="text-primary font-mono font-bold text-xs">{formatEventTime(event)}</span>
                      <span>{event.event_type === "goal" ? "⚽" : event.event_type === "yellow_card" ? "🟨" : event.event_type === "red_card" ? "🟥" : "🔄"}</span>
                      {event.player_name && <span className="text-foreground/80 text-xs truncate">{event.player_name}</span>}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground text-center mb-1">{awayName}</p>
                  {events.filter(e => e.team === "away").map(event => (
                    <div key={event.id} className="flex items-center justify-end gap-2 bg-muted/30 rounded p-2 text-sm">
                      {event.player_name && <span className="text-foreground/80 text-xs truncate">{event.player_name}</span>}
                      <span>{event.event_type === "goal" ? "⚽" : event.event_type === "yellow_card" ? "🟨" : event.event_type === "red_card" ? "🟥" : "🔄"}</span>
                      <span className="text-primary font-mono font-bold text-xs">{formatEventTime(event)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Data:</strong> {match.match_date}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Ora:</strong> {match.match_time.substring(0, 5)}
            </p>
            {match.mister && !match.is_other_teams && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Mister:</strong> {match.mister.first_name} {match.mister.last_name}
              </p>
            )}
          </div>

          {/* Notes */}
          {match.notes && (
            <div>
              <h4 className="text-sm font-semibold text-foreground/80 mb-2">Note</h4>
              <p className="text-foreground/70">{match.notes}</p>
            </div>
          )}

          {/* Map Preview */}
          {match.field && (
            <div>
              <h4 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Posizione
              </h4>
              <div className="bg-muted rounded-lg p-4 mb-2">
                <p className="text-foreground font-medium mb-2">
                  {fieldInfo ? (
                    <>
                      <span className="text-accent font-bold">{fieldInfo.group}</span>
                      <span className="mx-1">–</span>
                      <span>{fieldInfo.code}</span>
                    </>
                  ) : (
                    match.field.name
                  )}
                </p>
                 {mapImage && fieldInfo?.pin && (
                   <div className="space-y-2">
                     <div className="relative rounded-lg overflow-hidden border border-border/50">
                       <img src={mapImage} alt="Mappa campi" className="w-full h-auto block cursor-zoom-in" onClick={() => setIsMapZoomed(true)} />
                       <div
                         className="absolute -translate-x-1/2 -translate-y-1/2"
                         style={{ left: `${fieldInfo.pin.x}%`, top: `${fieldInfo.pin.y}%` }}
                       >
                         <MapPin className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] text-primary fill-primary" strokeWidth={1.5} stroke="hsl(var(--primary-foreground))" />
                       </div>
                     </div>
                     <Button variant="outline" className="w-full" onClick={() => setIsMapZoomed(true)}>
                       Ingrandisci cartina
                     </Button>
                   </div>
                )}
              </div>
              {openUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(openUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apri su Maps
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isMapZoomed} onOpenChange={setIsMapZoomed}>
      <DialogContent className="bg-card border-border/50 text-card-foreground max-w-5xl p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-foreground">Cartina campo</DialogTitle>
        </DialogHeader>
        {mapImage && fieldInfo?.pin && (
          <div className="relative rounded-lg overflow-hidden border border-border/50">
            <img src={mapImage} alt="Cartina campo ingrandita" className="w-full h-auto block" />
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${fieldInfo.pin.x}%`, top: `${fieldInfo.pin.y}%` }}
            >
              <MapPin className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] text-primary fill-primary" strokeWidth={1.5} stroke="hsl(var(--primary-foreground))" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
