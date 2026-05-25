import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { AddMatchDialog } from "./AddMatchDialog";
import { ManageSessionsDialog } from "./ManageSessionsDialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Impostazioni</DialogTitle>
          </DialogHeader>

          {/* Quick action buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setIsAddMatchOpen(true)}
              className="bg-secondary hover:bg-secondary/90 text-primary-foreground rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-square transition-all active:scale-95"
            >
              <Plus className="w-8 h-8" />
              <span className="text-xs font-semibold text-center">Aggiungi Partita</span>
            </button>
            <button
              onClick={() => setIsSessionsOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-square transition-all active:scale-95"
            >
              <Users className="w-8 h-8" />
              <span className="text-xs font-semibold text-center">Gestisci Sessioni</span>
            </button>
          </div>

          <Tabs defaultValue="categories">
            <TabsList className="bg-muted/50 w-full flex-wrap h-auto">
              <TabsTrigger value="categories" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground text-xs">Categorie</TabsTrigger>
              <TabsTrigger value="misters" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground text-xs">Mister</TabsTrigger>
              <TabsTrigger value="fields" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground text-xs">Campi</TabsTrigger>
              <TabsTrigger value="teams" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground text-xs">Squadre</TabsTrigger>
              <TabsTrigger value="athletes" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground text-xs">Atleti</TabsTrigger>
            </TabsList>
            <TabsContent value="categories"><CategoriesTab /></TabsContent>
            <TabsContent value="misters"><MistersTab /></TabsContent>
            <TabsContent value="fields"><FieldsTab /></TabsContent>
            <TabsContent value="teams"><OpponentTeamsTab /></TabsContent>
            <TabsContent value="athletes"><AthletesTab /></TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddMatchDialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen} />
      <ManageSessionsDialog open={isSessionsOpen} onOpenChange={setIsSessionsOpen} />
    </>
  );
};

const CategoriesTab = () => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const addCategory = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: newName.trim(), sort_order: categories.length + 1 });
    if (error) { toast.error("Errore"); return; }
    toast.success("Categoria aggiunta");
    setNewName("");
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Categoria eliminata");
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const updateDefaults = async (id: string, field: "default_period_duration" | "default_total_periods", value: number) => {
    if (!value || value < 1) return;
    const payload: any = { [field]: value };
    const { error } = await supabase.from("categories").update(payload).eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Default aggiornati");
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuova categoria" className="bg-muted/50 text-foreground" />
        <Button onClick={addCategory} size="icon" className="bg-primary"><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2">
        {categories.map((c: any) => (
          <div key={c.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-semibold">{c.name}</span>
              <Button onClick={() => deleteCategory(c.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-foreground text-[10px]">Durata tempo (min)</Label>
                <Input
                  type="number" min={1}
                  defaultValue={c.default_period_duration ?? 25}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    if (v && v !== c.default_period_duration) updateDefaults(c.id, "default_period_duration", v);
                  }}
                  className="bg-muted/50 text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-foreground text-[10px]">Numero tempi</Label>
                <Input
                  type="number" min={1}
                  defaultValue={c.default_total_periods ?? 2}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    if (v && v !== c.default_total_periods) updateDefaults(c.id, "default_total_periods", v);
                  }}
                  className="bg-muted/50 text-foreground h-8 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MistersTab = () => {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: misters = [] } = useQuery({
    queryKey: ["misters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("misters").select("*").order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);
  };

  const addMister = async () => {
    if (!firstName.trim() || !lastName.trim() || !accessCode.trim()) return;
    const { error } = await supabase.from("misters").insert({
      first_name: firstName.trim(), last_name: lastName.trim(),
      access_code: accessCode.trim(), category: selectedCategories.join(",") || null,
    });
    if (error) { toast.error("Errore"); return; }
    toast.success("Mister aggiunto");
    setFirstName(""); setLastName(""); setAccessCode(""); setSelectedCategories([]);
    queryClient.invalidateQueries({ queryKey: ["misters"] });
  };

  const deleteMister = async (id: string) => {
    const { error } = await supabase.from("misters").delete().eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Mister eliminato");
    queryClient.invalidateQueries({ queryKey: ["misters"] });
  };

  const updateCode = async (id: string, newCode: string) => {
    const { error } = await supabase.from("misters").update({ access_code: newCode }).eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Codice aggiornato");
    queryClient.invalidateQueries({ queryKey: ["misters"] });
  };

  const updateMisterCategories = async (id: string, cats: string[]) => {
    const { error } = await supabase.from("misters").update({ category: cats.join(",") || null }).eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Categorie aggiornate");
    queryClient.invalidateQueries({ queryKey: ["misters"] });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" className="bg-muted/50 text-foreground" />
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" className="bg-muted/50 text-foreground" />
        </div>
        <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Codice accesso" className="bg-muted/50 text-foreground" />
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <Button key={c.id} size="sm" variant={selectedCategories.includes(c.name) ? "default" : "outline"}
              onClick={() => toggleCategory(c.name)} className="text-xs h-7">
              {c.name}
            </Button>
          ))}
        </div>
        <Button onClick={addMister} className="w-full bg-primary"><Plus className="w-4 h-4 mr-2" />Aggiungi Mister</Button>
      </div>
      <div className="space-y-2">
        {misters.map((m) => {
          const mCats = m.category ? m.category.split(",").map((s: string) => s.trim()) : [];
          return (
            <div key={m.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-semibold">{m.first_name} {m.last_name}</span>
                <Button onClick={() => deleteMister(m.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <Button key={c.id} size="sm" variant={mCats.includes(c.name) ? "default" : "outline"}
                    onClick={() => {
                      const newCats = mCats.includes(c.name) ? mCats.filter((x: string) => x !== c.name) : [...mCats, c.name];
                      updateMisterCategories(m.id, newCats);
                    }} className="text-xs h-6 px-2">
                    {c.name}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Codice: </span>
                <Input
                  defaultValue={m.access_code}
                  onBlur={(e) => { if (e.target.value !== m.access_code) updateCode(m.id, e.target.value); }}
                  className="h-7 w-24 bg-muted/50 text-foreground text-xs"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FieldsTab = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const { data: fields = [] } = useQuery({
    queryKey: ["fields"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fields").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addField = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("fields").insert({ name: name.trim(), google_maps_url: mapsUrl.trim() || null });
    if (error) { toast.error("Errore"); return; }
    toast.success("Campo aggiunto");
    setName(""); setMapsUrl("");
    queryClient.invalidateQueries({ queryKey: ["fields"] });
  };

  const deleteField = async (id: string) => {
    const { error } = await supabase.from("fields").delete().eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Campo eliminato");
    queryClient.invalidateQueries({ queryKey: ["fields"] });
  };

  const startEdit = (f: any) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditUrl(f.google_maps_url ?? "");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase.from("fields").update({
      name: editName.trim(),
      google_maps_url: editUrl.trim() || null,
    }).eq("id", editingId);
    if (error) { toast.error("Errore"); return; }
    toast.success("Campo aggiornato");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["fields"] });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome campo (es. MINERVA - C7A)" className="bg-muted/50 text-foreground" />
        <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Link Google Maps" className="bg-muted/50 text-foreground" />
        <Button onClick={addField} className="w-full bg-primary"><Plus className="w-4 h-4 mr-2" />Aggiungi Campo</Button>
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="bg-muted/30 rounded-lg p-3">
            {editingId === f.id ? (
              <div className="space-y-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted/50 text-foreground" placeholder="Nome campo" />
                <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="bg-muted/50 text-foreground" placeholder="Link Google Maps" />
                <div className="flex gap-2">
                  <Button onClick={saveEdit} size="sm" className="flex-1 bg-primary">Salva</Button>
                  <Button onClick={() => setEditingId(null)} size="sm" variant="ghost" className="flex-1">Annulla</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate">{f.name}</div>
                  {f.google_maps_url && (
                    <a href={f.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">Maps</a>
                  )}
                </div>
                <Button onClick={() => startEdit(f)} size="icon" variant="ghost" className="text-foreground">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button onClick={() => deleteField(f.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const OpponentTeamsTab = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newTeamName, setNewTeamName] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["opponent-teams", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase.from("opponent_teams").select("*").eq("category_id", selectedCategory).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategory,
  });

  const addTeam = async () => {
    if (!newTeamName.trim() || !selectedCategory) return;
    const { error } = await supabase.from("opponent_teams").insert({ name: newTeamName.trim(), category_id: selectedCategory });
    if (error) { toast.error("Errore"); return; }
    toast.success("Squadra aggiunta");
    setNewTeamName("");
    queryClient.invalidateQueries({ queryKey: ["opponent-teams"] });
  };

  const deleteTeam = async (id: string) => {
    const { error } = await supabase.from("opponent_teams").delete().eq("id", id);
    if (error) { toast.error("Errore"); return; }
    toast.success("Squadra eliminata");
    queryClient.invalidateQueries({ queryKey: ["opponent-teams"] });
  };

  return (
    <div className="space-y-4 mt-4">
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
        <SelectContent>
          {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
        </SelectContent>
      </Select>

      {selectedCategory && (
        <>
          <div className="flex gap-2">
            <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Nome squadra" className="bg-muted/50 text-foreground" />
            <Button onClick={addTeam} size="icon" className="bg-primary"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <span className="text-foreground">{t.name}</span>
                <Button onClick={() => deleteTeam(t.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AthletesTab = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ["athlete-sessions", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("sessions")
        .select("*")
        .eq("session_type", "athlete")
        .eq("is_active", true)
        .order("last_name");

      if (selectedCategory) {
        const cat = categories.find(c => c.id === selectedCategory);
        if (cat) {
          query = query.eq("category", cat.name);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: categories.length > 0,
  });

  const updateAthleteCategory = async (sessionId: string, newCategory: string) => {
    const { error } = await supabase.from("sessions").update({ category: newCategory }).eq("id", sessionId);
    if (error) { toast.error("Errore"); return; }
    toast.success("Categoria aggiornata");
    queryClient.invalidateQueries({ queryKey: ["athlete-sessions"] });
  };

  return (
    <div className="space-y-4 mt-4">
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Tutte le categorie" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutte</SelectItem>
          {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
        </SelectContent>
      </Select>

      <div className="space-y-2">
        {athletes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nessun atleta registrato</p>
        ) : (
          athletes.map((a) => (
            <div key={a.id} className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-semibold">{a.first_name} {a.last_name}</span>
              </div>
              <div className="mt-2">
                <Select value={a.category || ""} onValueChange={(v) => updateAthleteCategory(a.id, v)}>
                  <SelectTrigger className="bg-muted/50 text-foreground h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
