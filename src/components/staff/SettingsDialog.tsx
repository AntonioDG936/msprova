import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Impostazioni</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="categories">
          <TabsList className="bg-muted/50 w-full">
            <TabsTrigger value="categories" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground">Categorie</TabsTrigger>
            <TabsTrigger value="misters" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground">Mister</TabsTrigger>
            <TabsTrigger value="fields" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground">Campi</TabsTrigger>
          </TabsList>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="misters"><MistersTab /></TabsContent>
          <TabsContent value="fields"><FieldsTab /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuova categoria" className="bg-muted/50 text-foreground" />
        <Button onClick={addCategory} size="icon" className="bg-primary"><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
            <span className="text-foreground">{c.name}</span>
            <Button onClick={() => deleteCategory(c.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
              <Trash2 className="w-4 h-4" />
            </Button>
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
  const [category, setCategory] = useState("");

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

  const addMister = async () => {
    if (!firstName.trim() || !lastName.trim() || !accessCode.trim()) return;
    const { error } = await supabase.from("misters").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      access_code: accessCode.trim(),
      category: category || null,
    });
    if (error) { toast.error("Errore"); return; }
    toast.success("Mister aggiunto");
    setFirstName(""); setLastName(""); setAccessCode(""); setCategory("");
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

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" className="bg-muted/50 text-foreground" />
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" className="bg-muted/50 text-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Codice accesso" className="bg-muted/50 text-foreground" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-muted/50 text-foreground"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={addMister} className="w-full bg-primary"><Plus className="w-4 h-4 mr-2" />Aggiungi Mister</Button>
      </div>
      <div className="space-y-2">
        {misters.map((m) => (
          <div key={m.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-semibold">{m.first_name} {m.last_name}</span>
              <Button onClick={() => deleteMister(m.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Cat: {m.category || "—"}</span>
              <span>|</span>
              <span>Codice: </span>
              <Input
                defaultValue={m.access_code}
                onBlur={(e) => { if (e.target.value !== m.access_code) updateCode(m.id, e.target.value); }}
                className="h-7 w-24 bg-muted/50 text-foreground text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FieldsTab = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

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

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome campo" className="bg-muted/50 text-foreground" />
        <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Link Google Maps" className="bg-muted/50 text-foreground" />
        <Button onClick={addField} className="w-full bg-primary"><Plus className="w-4 h-4 mr-2" />Aggiungi Campo</Button>
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
            <div>
              <span className="text-foreground">{f.name}</span>
              {f.google_maps_url && (
                <a href={f.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs ml-2 hover:underline">
                  Maps
                </a>
              )}
            </div>
            <Button onClick={() => deleteField(f.id)} size="icon" variant="ghost" className="text-destructive-foreground hover:bg-destructive/20">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
