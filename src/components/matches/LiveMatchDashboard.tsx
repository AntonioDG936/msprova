import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Pause, Clock, Plus, Minus } from "lucide-react";

interface LiveMatchDashboardProps {
  match: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const LiveMatchDashboard = ({ match, open, onOpenChange, onUpdate }: LiveMatchDashboardProps) => {
  const [homeScore, setHomeScore] = useState(match.score_home ?? 0);
  const [awayScore, setAwayScore] = useState(match.score_away ?? 0);
  const [currentMinute, setCurrentMinute] = useState(match.current_minute ?? 0);
  const [currentSecond, setCurrentSecond] = useState(match.current_second ?? 0);
  const [currentPeriod, setCurrentPeriod] = useState(match.current_period ?? 1);
  const [totalPeriods, setTotalPeriods] = useState(2);
  const [periodDuration, setPeriodDuration] = useState(45);
  const [isPeriodEnded, setIsPeriodEnded] = useState(false);
  const [isInterval, setIsInterval] = useState(match.is_interval ?? false);
  const [matchStartTime, setMatchStartTime] = useState<Date | null>(
    match.match_start_time ? new Date(match.match_start_time) : null
  );

  const [isPlaying, setIsPlaying] = useState(() => {
    return match.status === "in_progress" &&
      match.match_start_time !== null &&
      !match.is_interval;
  });

  useEffect(() => {
    setHomeScore(match.score_home ?? 0);
    setAwayScore(match.score_away ?? 0);
    setCurrentPeriod(match.current_period ?? 1);
    setIsInterval(match.is_interval ?? false);

    if (match.match_start_time) {
      setMatchStartTime(new Date(match.match_start_time));
      if (match.status === "in_progress" && !match.is_interval) {
        setIsPlaying(true);
      }
    } else {
      setCurrentMinute(match.current_minute ?? 0);
      setCurrentSecond(match.current_second ?? 0);
    }
  }, [match]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isPlaying && !isPeriodEnded && !isInterval && matchStartTime) {
      const calculateTime = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - matchStartTime.getTime();
        const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

        const newMinute = Math.floor(totalSeconds / 60);
        const newSecond = totalSeconds % 60;

        setCurrentMinute(newMinute);
        setCurrentSecond(newSecond);

        if (newMinute >= periodDuration) {
          setIsPeriodEnded(true);
          setIsPlaying(false);
        }

        return { newMinute, newSecond, totalSeconds };
      };

      calculateTime();

      interval = setInterval(() => {
        const { newMinute, newSecond, totalSeconds } = calculateTime();

        if (totalSeconds % 10 === 0) {
          supabase
            .from("matches")
            .update({
              current_minute: newMinute,
              current_second: newSecond,
              current_period: currentPeriod,
              is_interval: false,
              status: "in_progress",
            })
            .eq("id", match.id)
            .then();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isPeriodEnded, isInterval, periodDuration, currentPeriod, matchStartTime, match.id]);

  const handleStartStop = async () => {
    if (!isPlaying && !matchStartTime) {
      const now = new Date();
      setMatchStartTime(now);
      setIsPlaying(true);

      await supabase
        .from("matches")
        .update({
          match_start_time: now.toISOString(),
          status: "in_progress",
        })
        .eq("id", match.id);
    } else if (!isPlaying && matchStartTime) {
      const now = new Date();
      const currentElapsedMs = (currentMinute * 60 + currentSecond) * 1000;
      const adjustedStartTime = new Date(now.getTime() - currentElapsedMs);
      setMatchStartTime(adjustedStartTime);
      setIsPlaying(true);

      await supabase
        .from("matches")
        .update({
          match_start_time: adjustedStartTime.toISOString(),
        })
        .eq("id", match.id);
    } else {
      setIsPlaying(false);
    }
  };

  const updateScore = async (home: number, away: number) => {
    const { error } = await supabase
      .from("matches")
      .update({
        score_home: home,
        score_away: away,
        status: "in_progress",
      })
      .eq("id", match.id);

    if (!error) onUpdate();
  };

  const incrementHomeScore = () => {
    const newScore = homeScore + 1;
    setHomeScore(newScore);
    updateScore(newScore, awayScore);
    toast.success("Gol!");
  };

  const incrementAwayScore = () => {
    const newScore = awayScore + 1;
    setAwayScore(newScore);
    updateScore(homeScore, newScore);
    toast.success("Gol!");
  };

  const decrementHomeScore = () => {
    if (homeScore > 0) {
      const newScore = homeScore - 1;
      setHomeScore(newScore);
      updateScore(newScore, awayScore);
    }
  };

  const decrementAwayScore = () => {
    if (awayScore > 0) {
      const newScore = awayScore - 1;
      setAwayScore(newScore);
      updateScore(homeScore, newScore);
    }
  };

  const endPeriod = async () => {
    if (currentPeriod >= totalPeriods) {
      endMatch();
    } else {
      setIsInterval(true);
      setIsPeriodEnded(false);
      setIsPlaying(false);
      setMatchStartTime(null);

      await supabase
        .from("matches")
        .update({
          current_minute: currentMinute,
          current_second: currentSecond,
          current_period: currentPeriod,
          is_interval: true,
          match_start_time: null,
        })
        .eq("id", match.id);

      toast.success(`Tempo ${currentPeriod} finito - Intervallo`);
    }
  };

  const startNextPeriod = async () => {
    const nextPeriod = currentPeriod + 1;
    setCurrentPeriod(nextPeriod);
    setCurrentMinute(0);
    setCurrentSecond(0);
    setIsInterval(false);
    setIsPeriodEnded(false);
    setMatchStartTime(null);

    await supabase
      .from("matches")
      .update({
        current_minute: 0,
        current_second: 0,
        current_period: nextPeriod,
        is_interval: false,
        match_start_time: null,
      })
      .eq("id", match.id);

    toast.success(`Inizia Tempo ${nextPeriod}`);
  };

  const endMatch = async () => {
    const { error } = await supabase
      .from("matches")
      .update({
        score_home: homeScore,
        score_away: awayScore,
        status: "completed",
        current_minute: 0,
        current_second: 0,
        current_period: 1,
        is_interval: false,
        match_start_time: null,
      })
      .eq("id", match.id);

    if (!error) {
      toast.success("Partita terminata");
      onUpdate();
      onOpenChange(false);
    }
  };

  const formatTime = () => {
    if (isInterval) return "INTERVALLO";
    const mins = currentMinute.toString().padStart(2, '0');
    const secs = currentSecond.toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const categoryName = match.category?.name || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-card-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Dashboard Controllo Partita Live</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Display */}
          <div className="text-center bg-background/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Napoli Campania {categoryName}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={decrementHomeScore} variant="outline" size="icon" className="h-8 w-8">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-4xl font-bold text-primary min-w-[60px]">{homeScore}</span>
                  <Button onClick={incrementHomeScore} variant="default" size="icon" className="h-8 w-8 bg-secondary hover:bg-secondary/90">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="px-6">
                <div className="text-6xl font-bold text-accent">-</div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {match.opponent}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={decrementAwayScore} variant="outline" size="icon" className="h-8 w-8">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-4xl font-bold text-primary min-w-[60px]">{awayScore}</span>
                  <Button onClick={incrementAwayScore} variant="default" size="icon" className="h-8 w-8 bg-secondary hover:bg-secondary/90">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-foreground/80">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-semibold">
                {formatTime()} - Tempo {currentPeriod}/{totalPeriods}
              </span>
            </div>
          </div>

          {/* Match Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periods">Numero Tempi</Label>
              <Input
                id="periods"
                type="number"
                value={totalPeriods}
                onChange={(e) => setTotalPeriods(parseInt(e.target.value) || 2)}
                className="bg-background border-border text-foreground"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="duration">Durata Tempo (min)</Label>
              <Input
                id="duration"
                type="number"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 45)}
                className="bg-background border-border text-foreground"
                min="1"
              />
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex gap-2">
            {!isInterval ? (
              <>
                <Button
                  onClick={handleStartStop}
                  variant={isPlaying ? "secondary" : "default"}
                  className="flex-1"
                  disabled={isPeriodEnded}
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? "Pausa" : "Avvia Timer"}
                </Button>
                <Button onClick={endPeriod} variant="outline" className="flex-1">
                  Fine Tempo {currentPeriod}
                </Button>
              </>
            ) : (
              <Button onClick={startNextPeriod} variant="default" className="w-full">
                Inizia Tempo {currentPeriod + 1}
              </Button>
            )}
          </div>

          <Button onClick={endMatch} variant="destructive" className="w-full">
            Termina Partita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
