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
  const [totalPeriods, setTotalPeriods] = useState(match.total_periods ?? 2);
  const [periodDuration, setPeriodDuration] = useState(match.period_duration ?? 25);
  const [isInterval, setIsInterval] = useState(match.is_interval ?? false);
  const [stoppageMinutes, setStoppageMinutes] = useState<number | null>(match.stoppage_minutes ?? null);
  const [stoppageInput, setStoppageInput] = useState("");
  const [matchStartTime, setMatchStartTime] = useState<Date | null>(
    match.match_start_time ? new Date(match.match_start_time) : null
  );

  // Goal scorer dialog
  const [goalDialog, setGoalDialog] = useState<{ team: "home" | "away" } | null>(null);
  const [goalScorer, setGoalScorer] = useState("");

  const [isPlaying, setIsPlaying] = useState(() => {
    return match.status === "in_progress" && match.match_start_time !== null && !match.is_interval;
  });

  const isInStoppage = currentMinute >= periodDuration;
  const stoppageElapsed = isInStoppage ? currentMinute - periodDuration : 0;
  const stoppageSecondsElapsed = isInStoppage ? currentSecond : 0;
  const showFinishButton = isInStoppage && (stoppageMinutes === null || stoppageElapsed >= stoppageMinutes);

  useEffect(() => {
    setHomeScore(match.score_home ?? 0);
    setAwayScore(match.score_away ?? 0);
    setCurrentPeriod(match.current_period ?? 1);
    setIsInterval(match.is_interval ?? false);
    setTotalPeriods(match.total_periods ?? 2);
    setPeriodDuration(match.period_duration ?? 25);
    setStoppageMinutes(match.stoppage_minutes ?? null);

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

    if (isPlaying && !isInterval && matchStartTime) {
      const calculateTime = () => {
        const now = new Date();
        const elapsedMs = now.getTime() - matchStartTime.getTime();
        const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
        const newMinute = Math.floor(totalSeconds / 60);
        const newSecond = totalSeconds % 60;
        setCurrentMinute(newMinute);
        setCurrentSecond(newSecond);
        return { newMinute, newSecond, totalSeconds };
      };

      calculateTime();

      interval = setInterval(() => {
        const { newMinute, newSecond, totalSeconds } = calculateTime();
        // sync DB ogni 5s come fallback (i client calcolano comunque dal match_start_time ogni 1s)
        if (totalSeconds % 5 === 0) {
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
  }, [isPlaying, isInterval, currentPeriod, matchStartTime, match.id]);

  const handleStartStop = async () => {
    if (!isPlaying && !matchStartTime) {
      const now = new Date();
      setMatchStartTime(now);
      setIsPlaying(true);
      await supabase.from("matches").update({
        match_start_time: now.toISOString(),
        status: "in_progress",
        period_duration: periodDuration,
        total_periods: totalPeriods,
      }).eq("id", match.id);
    } else if (!isPlaying && matchStartTime) {
      const now = new Date();
      const currentElapsedMs = (currentMinute * 60 + currentSecond) * 1000;
      const adjustedStartTime = new Date(now.getTime() - currentElapsedMs);
      setMatchStartTime(adjustedStartTime);
      setIsPlaying(true);
      await supabase.from("matches").update({
        match_start_time: adjustedStartTime.toISOString(),
      }).eq("id", match.id);
    } else {
      setIsPlaying(false);
    }
  };

  const updateScore = async (home: number, away: number) => {
    await supabase.from("matches").update({
      score_home: home,
      score_away: away,
      status: "in_progress",
    }).eq("id", match.id);
    onUpdate();
  };

  const confirmGoal = async () => {
    const isHome = goalDialog?.team === "home";
    const newHome = isHome ? homeScore + 1 : homeScore;
    const newAway = isHome ? awayScore : awayScore + 1;
    
    if (isHome) setHomeScore(newHome); else setAwayScore(newAway);
    updateScore(newHome, newAway);

    // Record event
    await supabase.from("match_events").insert({
      match_id: match.id,
      event_type: "goal",
      minute: currentMinute,
      second: currentSecond,
      period: currentPeriod,
      player_name: goalScorer.trim() || null,
      team: goalDialog?.team || "home",
    });

    toast.success("Gol!");
    setGoalDialog(null);
    setGoalScorer("");
  };

  const decrementScore = async (team: "home" | "away") => {
    if (team === "home" && homeScore > 0) {
      const n = homeScore - 1;
      setHomeScore(n);
      updateScore(n, awayScore);
    } else if (team === "away" && awayScore > 0) {
      const n = awayScore - 1;
      setAwayScore(n);
      updateScore(homeScore, n);
    }
  };

  const setStoppage = async () => {
    const mins = parseInt(stoppageInput);
    if (!isNaN(mins) && mins > 0) {
      setStoppageMinutes(mins);
      await supabase.from("matches").update({ stoppage_minutes: mins }).eq("id", match.id);
      toast.success(`${mins} minuti di recupero assegnati`);
      setStoppageInput("");
    }
  };

  const endPeriod = async () => {
    if (currentPeriod >= totalPeriods) {
      endMatch();
    } else {
      setIsInterval(true);
      setIsPlaying(false);
      setMatchStartTime(null);
      setStoppageMinutes(null);

      await supabase.from("matches").update({
        current_minute: currentMinute,
        current_second: currentSecond,
        current_period: currentPeriod,
        is_interval: true,
        match_start_time: null,
        stoppage_minutes: null,
      }).eq("id", match.id);

      toast.success(`Tempo ${currentPeriod} finito - Intervallo`);
    }
  };

  const startNextPeriod = async () => {
    const nextPeriod = currentPeriod + 1;
    setCurrentPeriod(nextPeriod);
    setCurrentMinute(0);
    setCurrentSecond(0);
    setIsInterval(false);
    setMatchStartTime(null);
    setStoppageMinutes(null);

    await supabase.from("matches").update({
      current_minute: 0,
      current_second: 0,
      current_period: nextPeriod,
      is_interval: false,
      match_start_time: null,
      stoppage_minutes: null,
    }).eq("id", match.id);

    toast.success(`Inizia Tempo ${nextPeriod}`);
  };

  const endMatch = async () => {
    await supabase.from("matches").update({
      score_home: homeScore,
      score_away: awayScore,
      status: "completed",
      current_minute: 0,
      current_second: 0,
      current_period: 1,
      is_interval: false,
      match_start_time: null,
      stoppage_minutes: null,
    }).eq("id", match.id);

    toast.success("Partita terminata");
    onUpdate();
    onOpenChange(false);
  };

  const formatTime = () => {
    if (isInterval) return "INTERVALLO";
    if (isInStoppage) {
      const extraMin = stoppageElapsed.toString().padStart(2, '0');
      const extraSec = stoppageSecondsElapsed.toString().padStart(2, '0');
      return `${periodDuration}' +${extraMin}:${extraSec}`;
    }
    return `${currentMinute.toString().padStart(2, '0')}:${currentSecond.toString().padStart(2, '0')}`;
  };

  const categoryName = match.category?.name || "";
  const napoliAway = !match.is_other_teams && match.napoli_is_home === false;
  const homeLabel = napoliAway ? match.opponent : `Napoli Campania ${categoryName}`;
  const awayLabel = napoliAway ? `Napoli Campania ${categoryName}` : match.opponent;

  return (
    <>
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
                    {homeLabel}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => decrementScore("home")} variant="outline" size="icon" className="h-8 w-8">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-4xl font-bold text-primary min-w-[60px]">{homeScore}</span>
                    <Button onClick={() => setGoalDialog({ team: "home" })} variant="default" size="icon" className="h-8 w-8 bg-secondary hover:bg-secondary/90">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="px-6">
                  <div className="text-6xl font-bold text-accent">-</div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {awayLabel}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => decrementScore("away")} variant="outline" size="icon" className="h-8 w-8">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-4xl font-bold text-primary min-w-[60px]">{awayScore}</span>
                    <Button onClick={() => setGoalDialog({ team: "away" })} variant="default" size="icon" className="h-8 w-8 bg-secondary hover:bg-secondary/90">
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

            {/* Match Settings (only before starting) */}
            {!matchStartTime && match.status !== "in_progress" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periods">Numero Tempi</Label>
                  <Input id="periods" type="number" value={totalPeriods} onChange={(e) => setTotalPeriods(parseInt(e.target.value) || 2)} className="bg-background border-border text-foreground" min="1" />
                </div>
                <div>
                  <Label htmlFor="duration">Durata Tempo (min)</Label>
                  <Input id="duration" type="number" value={periodDuration} onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 25)} className="bg-background border-border text-foreground" min="1" />
                </div>
              </div>
            )}

            {/* Stoppage time controls */}
            {isInStoppage && !isInterval && (
              <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 space-y-3">
                <p className="text-secondary font-semibold text-center">⏱ RECUPERO</p>
                {stoppageMinutes === null ? (
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={stoppageInput} onChange={(e) => setStoppageInput(e.target.value)} placeholder="Min. recupero (opzionale)" className="bg-background border-border text-foreground" min="1" />
                    <Button onClick={setStoppage} size="sm" variant="outline">Assegna</Button>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Recupero assegnato: {stoppageMinutes} min</p>
                )}
              </div>
            )}

            {/* Timer Controls */}
            <div className="flex gap-2">
              {!isInterval ? (
                <>
                  <Button onClick={handleStartStop} variant={isPlaying ? "secondary" : "default"} className="flex-1">
                    {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? "Pausa" : "Avvia Timer"}
                  </Button>
                  {showFinishButton ? (
                    <Button onClick={endPeriod} variant="destructive" className="flex-1">
                      {currentPeriod >= totalPeriods ? "Finisci Partita" : `Fine Tempo ${currentPeriod}`}
                    </Button>
                  ) : (
                    <Button onClick={endPeriod} variant="outline" className="flex-1">
                      Fine Tempo {currentPeriod}
                    </Button>
                  )}
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

      {/* Goal scorer dialog */}
      <Dialog open={!!goalDialog} onOpenChange={(o) => { if (!o) { setGoalDialog(null); setGoalScorer(""); } }}>
        <DialogContent className="bg-card border-border/50 text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">⚽ GOL! {goalDialog?.team === "home" ? "Napoli Campania" : match.opponent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chi ha segnato? (opzionale)</Label>
              <Input value={goalScorer} onChange={(e) => setGoalScorer(e.target.value)} placeholder="Nome giocatore" className="bg-background border-border text-foreground" />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmGoal} className="flex-1 bg-secondary hover:bg-secondary/90">Conferma Gol</Button>
              <Button onClick={() => { setGoalDialog(null); setGoalScorer(""); }} variant="outline" className="flex-1">Annulla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
