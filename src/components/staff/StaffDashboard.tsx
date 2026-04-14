import { useState } from "react";
import { Plus, Users, MapPin, Settings, CalendarDays, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddMatchDialog } from "./AddMatchDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ManageSessionsDialog } from "./ManageSessionsDialog";
import { StaffMatchesView } from "./StaffMatchesView";

type View = "home" | "matches";

export const StaffDashboard = () => {
  const [view, setView] = useState<View>("home");
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

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

  const buttons = [
    { icon: Plus, label: "Aggiungi Partita", onClick: () => setIsAddMatchOpen(true), color: "bg-secondary hover:bg-secondary/90" },
    { icon: CalendarDays, label: "Vedi Partite", onClick: () => setView("matches"), color: "bg-primary hover:bg-primary/90" },
    { icon: Users, label: "Gestisci Sessioni", onClick: () => setIsSessionsOpen(true), color: "bg-primary hover:bg-primary/90" },
    { icon: Settings, label: "Impostazioni", onClick: () => setIsSettingsOpen(true), color: "bg-muted hover:bg-muted/80" },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Torneo di Paestum</h1>
          <p className="text-accent text-sm">Area Staff</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {buttons.map((btn) => (
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

      <AddMatchDialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <ManageSessionsDialog open={isSessionsOpen} onOpenChange={setIsSessionsOpen} />
    </div>
  );
};
