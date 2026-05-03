import { useState } from "react";
import { Trophy, History, CalendarDays, Apple, Edit, Plus, Settings, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffMatchesView } from "./StaffMatchesView";
import { SettingsDialog } from "./SettingsDialog";
import { StaffClassifiche } from "./StaffClassifiche";
import { MatchHistoryDialog } from "./MatchHistoryDialog";
import { FinalPhasesView } from "./FinalPhasesView";

type View = "home" | "matches" | "classifiche" | "final_phases";

export const StaffDashboard = () => {
  const [view, setView] = useState<View>("home");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleAppleCalendar = () => {
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed`;
    // Apple Calendar expects webcal:// for subscription
    const webcalUrl = baseUrl.replace("https://", "webcal://").replace("http://", "webcal://");
    window.open(webcalUrl, "_self");
  };

  if (view === "classifiche") {
    return <StaffClassifiche onBack={() => setView("home")} />;
  }

  if (view === "final_phases") {
    return <FinalPhasesView onBack={() => setView("home")} />;
  }

  if (view === "matches") {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Partite</h1>
            <Button variant="outline" onClick={() => setView("home")} className="text-foreground border-primary/30">
              ← Dashboard
            </Button>
          </div>
          <StaffMatchesView />
        </div>
      </div>
    );
  }

  const mainButtons = [
    { icon: Trophy, label: "Classifiche", onClick: () => setView("classifiche"), color: "bg-primary hover:bg-primary/90" },
    { icon: Award, label: "Fasi Finali", onClick: () => setView("final_phases"), color: "bg-secondary hover:bg-secondary/90" },
    { icon: CalendarDays, label: "Calendario", onClick: handleAppleCalendar, color: "bg-primary hover:bg-primary/90" },
    { icon: History, label: "Storico Partite", onClick: () => setIsHistoryOpen(true), color: "bg-primary hover:bg-primary/90" },
    { icon: Edit, label: "Gestisci Partite", onClick: () => setView("matches"), color: "bg-secondary hover:bg-secondary/90" },
    { icon: Settings, label: "Impostazioni", onClick: () => setIsSettingsOpen(true), color: "bg-muted hover:bg-muted/80" },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Torneo di Sibari</h1>
          <p className="text-accent text-sm">Area Staff</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {mainButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className={`${btn.color} text-primary-foreground rounded-xl p-6 flex flex-col items-center justify-center gap-3 aspect-square transition-all active:scale-95`}
            >
              <btn.icon className="w-10 h-10" />
              <span className="text-sm font-semibold text-center">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <MatchHistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />
    </div>
  );
};
