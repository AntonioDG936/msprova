import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Clock } from "lucide-react";

interface MatchDetailDialogProps {
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
    mister?: { first_name: string; last_name: string } | null;
    field?: { name: string; google_maps_url: string | null } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export const MatchDetailDialog = ({ match, open, onOpenChange }: MatchDetailDialogProps) => {
  const hasResult = match.score_home !== null && match.score_away !== null;
  const isLive = match.status === "in_progress";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-card-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Dettagli Partita</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Teams and Score */}
          <div className="text-center">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground">Napoli Campania</h3>
              </div>
              <div className="text-center space-y-2">
                <div className="px-6 py-3 rounded-lg bg-muted">
                  <span className="text-2xl font-bold text-foreground">
                    {hasResult ? `${match.score_home} - ${match.score_away}` : "- -"}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-xl font-bold text-foreground">{match.opponent}</h3>
              </div>
            </div>

            {isLive && (
              <div className="flex items-center justify-center gap-2 mb-4 text-primary font-semibold">
                <Clock className="w-5 h-5" />
                <span className="text-lg">
                  {match.is_interval
                    ? "INTERVALLO"
                    : `${(match.current_minute ?? 0).toString().padStart(2, '0')}:${(match.current_second ?? 0).toString().padStart(2, '0')} - Tempo ${match.current_period}`}
                </span>
              </div>
            )}

            {match.category && (
              <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded text-sm font-semibold">
                {match.category.name}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Data:</strong> {match.match_date}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Ora:</strong> {match.match_time.substring(0, 5)}
            </p>
            {match.mister && (
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
                <p className="text-foreground font-medium mb-2">{match.field.name}</p>
                <div className="rounded-lg overflow-hidden border border-border/50">
                  <iframe
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(match.field.name)}`}
                  />
                </div>
              </div>
              {match.field.google_maps_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(match.field!.google_maps_url!, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Apri in Google Maps
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
