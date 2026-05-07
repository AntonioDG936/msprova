import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchCard } from "@/components/MatchCard";
import { Loader2, Trophy, History, Users2 } from "lucide-react";
import { getDeviceId } from "@/lib/deviceId";
import { StandingsView } from "@/components/StandingsView";
import { MatchHistoryView } from "@/components/MatchHistoryView";
import { BracketButton } from "@/components/BracketDialog";
import logoNapoli from "@/assets/logo-napoli.png";

type View = "matches" | "classifiche" | "storico" | "other_teams";

const Index = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<{ first_name: string; last_name: string; category: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [category, setCategory] = useState("");
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
        .eq("session_type", "athlete")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setSession({ first_name: data.first_name, last_name: data.last_name, category: data.category || "" });
        setViewCategory(data.category || null);
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

  const activeCategory = viewCategory;

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", activeCategory],
    queryFn: async () => {
      if (!activeCategory) return [];
      const cat = categories.find((c) => c.name === activeCategory);
      if (!cat) return [];

      const { data, error } = await supabase
        .from("matches")
        .select("*, category:categories(*), mister:misters(*), field:fields(*)")
        .eq("category_id", cat.id)
        .eq("is_other_teams", false)
        .order("match_date")
        .order("match_time");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCategory && categories.length > 0,
  });

  // Other teams matches (no Napoli Campania)
  const { data: otherTeamsMatches = [], isLoading: otherLoading } = useQuery({
    queryKey: ["other-teams-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*, category:categories(*), field:fields(*)")
        .eq("is_other_teams", true)
        .order("match_date")
        .order("match_time");
      if (error) throw error;
      return data;
    },
    enabled: currentView === "other_teams",
  });

  // Realtime for matches
  useEffect(() => {
    const channel = supabase
      .channel('all-matches-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        queryClient.invalidateQueries({ queryKey: ["other-teams-matches"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleLogin = async () => {
    if (!firstName.trim() || !lastName.trim() || !category) return;
    const deviceId = getDeviceId();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const selectedCategory = category.trim();

    // Riutilizza utenza esistente con stesso nome/cognome/categoria
    const { data: existingSessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("session_type", "athlete")
      .ilike("first_name", fn)
      .ilike("last_name", ln)
      .ilike("category", selectedCategory)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });

    const [existing, ...duplicates] = existingSessions ?? [];

    if (existing) {
      await supabase
        .from("sessions")
        .update({
          first_name: fn,
          last_name: ln,
          category: selectedCategory,
          device_id: deviceId,
          is_active: true,
        })
        .eq("id", existing.id);

      if (duplicates.length > 0) {
        await supabase
          .from("sessions")
          .update({ is_active: false })
          .in("id", duplicates.map((item) => item.id));
      }
    } else {
      await supabase.from("sessions").insert({
        session_type: "athlete",
        first_name: fn,
        last_name: ln,
        category: selectedCategory,
        device_id: deviceId,
        is_active: true,
      });
    }

    setSession({ first_name: fn, last_name: ln, category: selectedCategory });
    setViewCategory(selectedCategory);
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
            <img src={logoNapoli} alt="T.D.G Napoli Campania" className="w-24 h-24 mx-auto" />
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
              Torneo di Sibari
            </CardTitle>
            <p className="text-accent text-sm sm:text-base">Accesso Atleti</p>
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
              <Label className="text-foreground">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-muted/50 text-foreground">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLogin} disabled={!firstName.trim() || !lastName.trim() || !category} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === "classifiche") {
    return <StandingsView onBack={() => setCurrentView("matches")} defaultCategory={viewCategory || session.category} />;
  }

  if (currentView === "storico") {
    return <MatchHistoryView onBack={() => setCurrentView("matches")} />;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <img src={logoNapoli} alt="T.D.G Napoli Campania" className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Torneo di Sibari</h1>
            <p className="text-accent text-sm">
              {session.first_name} {session.last_name} — Categoria {viewCategory}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={() => setCurrentView("classifiche")} variant="outline" size="sm" className="text-foreground border-primary/30">
            <Trophy className="w-4 h-4 mr-1" /> Classifica
          </Button>
          <Button onClick={() => setCurrentView("storico")} variant="outline" size="sm" className="text-foreground border-primary/30">
            <History className="w-4 h-4 mr-1" /> Storico
          </Button>
          <BracketButton categoryName={viewCategory} />
          <Button
            onClick={() => setCurrentView(currentView === "other_teams" ? "matches" : "other_teams")}
            variant={currentView === "other_teams" ? "default" : "outline"}
            size="sm"
            className={currentView === "other_teams" ? "" : "text-foreground border-primary/30"}
          >
            <Users2 className="w-4 h-4 mr-1" /> {currentView === "other_teams" ? "Mie Partite" : "Altre Squadre"}
          </Button>
        </div>

        {currentView === "other_teams" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-3">Partite tra Altre Squadre</h2>
            {otherLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : otherTeamsMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nessuna partita tra altre squadre</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherTeamsMatches.map((m: any) => (
                  <MatchCard key={m.id} match={m} showCategory={true} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Other categories toggle */}
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
                <p className="text-muted-foreground">Nessuna partita programmata per questa categoria</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match as any}
                    showCategory={true}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ["matches"] })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
