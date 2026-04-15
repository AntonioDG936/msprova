import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MatchCard } from "@/components/MatchCard";
import { Loader2, Trophy, History } from "lucide-react";
import { getDeviceId } from "@/lib/deviceId";
import { toast } from "sonner";
import { StandingsView } from "@/components/StandingsView";
import { MatchHistoryView } from "@/components/MatchHistoryView";

type View = "matches" | "classifiche" | "storico";

const MisterPage = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<{ first_name: string; last_name: string; category: string | null } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [viewCategory, setViewCategory] = useState<string | null>(null);
  const [showOtherCategories, setShowOtherCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("matches");

  useEffect(() => {
    document.body.classList.add("with-background");
    return () => document.body.classList.remove("with-background");
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const deviceId = getDeviceId();
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("device_id", deviceId)
        .eq("session_type", "mister")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setSession({ first_name: data.first_name, last_name: data.last_name, category: data.category });
        setViewCategory(data.category);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["mister-matches", viewCategory],
    queryFn: async () => {
      if (!viewCategory) return [];
      const cat = categories.find((c) => c.name === viewCategory);
      if (!cat) return [];

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("matches")
        .select("*, category:categories(*), mister:misters(*), field:fields(*)")
        .eq("category_id", cat.id)
        .gte("match_date", today)
        .order("match_date")
        .order("match_time");
      if (error) throw error;
      return data;
    },
    enabled: !!viewCategory && categories.length > 0,
  });

  const handleLogin = async () => {
    if (!firstName.trim() || !lastName.trim() || !accessCode.trim()) return;

    const { data: mister } = await supabase
      .from("misters")
      .select("*")
      .ilike("first_name", firstName.trim())
      .ilike("last_name", lastName.trim())
      .eq("access_code", accessCode.trim())
      .maybeSingle();

    if (!mister) {
      toast.error("Credenziali non valide");
      return;
    }

    const deviceId = getDeviceId();
    await supabase.from("sessions").insert({
      session_type: "mister",
      first_name: mister.first_name,
      last_name: mister.last_name,
      category: mister.category,
      device_id: deviceId,
      is_active: true,
    });

    setSession({ first_name: mister.first_name, last_name: mister.last_name, category: mister.category });
    setViewCategory(mister.category);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
              Torneo di Paestum
            </CardTitle>
            <p className="text-accent text-sm sm:text-base">Accesso Mister</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Nome</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Il tuo nome" className="bg-muted/50 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Cognome</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Il tuo cognome" className="bg-muted/50 text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Codice di accesso</Label>
              <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Codice" className="bg-muted/50 text-foreground" />
            </div>
            <Button onClick={handleLogin} disabled={!firstName.trim() || !lastName.trim() || !accessCode.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === "classifiche") {
    return <StandingsView onBack={() => setCurrentView("matches")} />;
  }

  if (currentView === "storico") {
    return <MatchHistoryView onBack={() => setCurrentView("matches")} />;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Torneo di Paestum</h1>
          <p className="text-accent text-sm">
            Mister {session.first_name} {session.last_name} — Categoria {viewCategory}
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          <Button onClick={() => setCurrentView("classifiche")} variant="outline" size="sm" className="text-foreground border-primary/30">
            <Trophy className="w-4 h-4 mr-1" /> Classifiche
          </Button>
          <Button onClick={() => setCurrentView("storico")} variant="outline" size="sm" className="text-foreground border-primary/30">
            <History className="w-4 h-4 mr-1" /> Storico
          </Button>
        </div>

        {!showOtherCategories ? (
          <Button onClick={() => setShowOtherCategories(true)} variant="outline" size="sm" className="mb-4 text-foreground border-primary/30">
            Altre Categorie
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={() => { setViewCategory(session.category); setShowOtherCategories(false); }} variant={viewCategory === session.category ? "default" : "outline"} size="sm" className={viewCategory === session.category ? "" : "text-foreground border-primary/30"}>
              {session.category} (mia)
            </Button>
            {categories.filter(c => c.name !== session.category).map((c) => (
              <Button key={c.id} onClick={() => setViewCategory(c.name)} variant={viewCategory === c.name ? "default" : "outline"} size="sm" className={viewCategory === c.name ? "" : "text-foreground border-primary/30"}>
                {c.name}
              </Button>
            ))}
          </div>
        )}

        {matchesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !matches || matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessuna partita programmata</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match as any}
                showCategory={true}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ["mister-matches"] })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisterPage;
