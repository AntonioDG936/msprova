import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ManageSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageSessionsDialog = ({ open, onOpenChange }: ManageSessionsDialogProps) => {
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const deactivateSession = async (id: string) => {
    const { error } = await supabase.from("sessions").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Sessione disattivata");
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  const deactivateAll = async () => {
    const { error } = await supabase.from("sessions").update({ is_active: false }).eq("is_active", true);
    if (error) { toast.error("Errore"); return; }
    toast.success("Tutte le sessioni disattivate");
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Gestisci Sessioni Attive</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sessions.length > 0 && (
            <Button onClick={deactivateAll} variant="destructive" className="w-full">
              Disattiva tutte le sessioni
            </Button>
          )}
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nessuna sessione attiva</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <div>
                  <p className="text-foreground font-semibold">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.session_type === "athlete" ? "Atleta" : "Mister"} — {s.category || "—"}
                  </p>
                </div>
                <Button onClick={() => deactivateSession(s.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
