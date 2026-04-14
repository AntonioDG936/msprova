import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Clock, MapPin, User, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MatchCardProps {
  match: {
    id: string;
    opponent: string;
    match_date: string;
    match_time: string;
    score_home: number | null;
    score_away: number | null;
    notes: string | null;
    category?: { name: string } | null;
    mister?: { first_name: string; last_name: string } | null;
    field?: { name: string; google_maps_url: string | null } | null;
  };
  showCategory?: boolean;
}

export const MatchCard = ({ match, showCategory = false }: MatchCardProps) => {
  const hasResult = match.score_home !== null && match.score_away !== null;

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-foreground">
            vs {match.opponent}
          </h3>
          {hasResult && (
            <span className="text-xl font-bold text-accent">
              {match.score_home} - {match.score_away}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {showCategory && match.category && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                {match.category.name}
              </span>
            </div>
          )}
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
              {match.field.google_maps_url ? (
                <a
                  href={match.field.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {match.field.name}
                </a>
              ) : (
                <span>{match.field.name}</span>
              )}
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
  );
};
