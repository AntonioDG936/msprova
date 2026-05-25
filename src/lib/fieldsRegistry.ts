import mappaMinerva from "@/assets/mappa-minerva.jpeg";

export type FieldGroup =
  | "MINERVA"
  | "MARLUSA"
  | "GIANNONE"
  | "POLIVALENTE"
  | "SIBARI GREEN VILLAGE";

export interface FieldInfo {
  group: FieldGroup;
  code: string;
  mapsUrl: string;
  /** Coordinate in % sulla cartina, se disponibili */
  pin?: { x: number; y: number };
}

/** Tutti i campi noti. Le coord pin sono % rispetto all'immagine Minerva. */
const REGISTRY: FieldInfo[] = [
  // MINERVA
  { group: "MINERVA", code: "C7A", mapsUrl: "https://maps.app.goo.gl/q4pav49fTPBr1742A?g_st=ic", pin: { x: 5, y: 5 } },
  { group: "MINERVA", code: "C7B", mapsUrl: "https://maps.app.goo.gl/TkkMkTxYMRL42Pa16?g_st=ic", pin: { x: 14, y: 62 } },
  { group: "MINERVA", code: "C7C", mapsUrl: "https://maps.app.goo.gl/MLAvxvstwascgA3L9?g_st=ic", pin: { x: 27, y: 80 } },
  { group: "MINERVA", code: "C9A", mapsUrl: "https://maps.app.goo.gl/1iHiX6rP8rY4kfiVA?g_st=ic", pin: { x: 46, y: 74 } },
  { group: "MINERVA", code: "C9B", mapsUrl: "https://maps.app.goo.gl/NuGMUifg7TxvXGHRA?g_st=ic", pin: { x: 47, y: 92 } },
  { group: "MINERVA", code: "C9C", mapsUrl: "https://maps.app.goo.gl/Y4mrg3pAoqcEuKgr8?g_st=ic", pin: { x: 58, y: 76 } },
  { group: "MINERVA", code: "C11A", mapsUrl: "https://maps.app.goo.gl/HkrjEpaBsxs3MoCR9?g_st=ic", pin: { x: 14, y: 76 } },
  { group: "MINERVA", code: "C11B", mapsUrl: "https://maps.app.goo.gl/RBfyNMHDJEs99UZu9?g_st=ic", pin: { x: 14, y: 92 } },
  { group: "MINERVA", code: "C11C", mapsUrl: "", pin: { x: 71, y: 87 } },
  { group: "MINERVA", code: "C9D", mapsUrl: "", pin: { x: 71, y: 93 } },

  // MARLUSA (stessa cartina)
  { group: "MARLUSA", code: "C5A", mapsUrl: "https://maps.app.goo.gl/1cfNjnQLrektm8Mb8?g_st=ic", pin: { x: 88, y: 49 } },
  { group: "MARLUSA", code: "C5B", mapsUrl: "https://maps.app.goo.gl/iy5tLBe9h1qfdQYYA?g_st=ic", pin: { x: 88, y: 57 } },

  // GIANNONE (no cartina)
  { group: "GIANNONE", code: "C9", mapsUrl: "https://maps.app.goo.gl/fGS1P3ZxM2o5XcSJ7?g_st=ic" },

  // POLIVALENTE (no cartina)
  { group: "POLIVALENTE", code: "C9A", mapsUrl: "https://maps.app.goo.gl/u3EqG7sdnyJjNx8u7?g_st=ic" },
  { group: "POLIVALENTE", code: "C11", mapsUrl: "https://maps.app.goo.gl/u3EqG7sdnyJjNx8u7?g_st=ic" },

  // SIBARI GREEN VILLAGE (no cartina)
  { group: "SIBARI GREEN VILLAGE", code: "C7", mapsUrl: "https://maps.app.goo.gl/G2DMR4GdprHePeEJA?g_st=ic" },
  { group: "SIBARI GREEN VILLAGE", code: "C5A", mapsUrl: "https://maps.app.goo.gl/va8vX7C1eXkFrJ7cA?g_st=ic" },
  { group: "SIBARI GREEN VILLAGE", code: "C5B", mapsUrl: "https://maps.app.goo.gl/qMfUBVHckBdv7und9?g_st=ic" },
  { group: "SIBARI GREEN VILLAGE", code: "C5C", mapsUrl: "https://maps.app.goo.gl/CZqqLiVbw8gt2g3y8?g_st=ic" },
  { group: "SIBARI GREEN VILLAGE", code: "C5D", mapsUrl: "https://maps.app.goo.gl/QZqbDjo68M6xLWR89?g_st=ic" },
];

export const MAPPA_MINERVA = mappaMinerva;

/** Le cartine disponibili per gruppo. */
export const GROUP_MAP: Partial<Record<FieldGroup, string>> = {
  MINERVA: mappaMinerva,
  MARLUSA: mappaMinerva,
};

const normalizeCode = (s: string) => s.replace(/\s+/g, "").toUpperCase();
const extractShortId = (url: string | null | undefined) => {
  if (!url) return null;
  const m = url.match(/goo\.gl\/(?:maps\/)?([A-Za-z0-9]+)/);
  return m ? m[1] : null;
};

const GROUPS: FieldGroup[] = ["SIBARI GREEN VILLAGE", "POLIVALENTE", "GIANNONE", "MARLUSA", "MINERVA"];

/** Risolve l'info del campo dato il nome (codice) e l'URL Maps salvati nel DB.
 *  Accetta sia "C7A" sia "MINERVA - C7A". */
export function resolveField(
  fieldName: string | null | undefined,
  mapsUrl: string | null | undefined,
): FieldInfo | null {
  if (!fieldName) return null;
  const raw = fieldName.toUpperCase();

  let group: FieldGroup | null = null;
  let codePart = raw;
  for (const g of GROUPS) {
    if (raw.startsWith(g)) {
      group = g;
      codePart = raw.slice(g.length).replace(/^[\s\-–—:]+/, "");
      break;
    }
  }
  const code = normalizeCode(codePart);

  let candidates = REGISTRY.filter((f) => normalizeCode(f.code) === code);
  if (group) candidates = candidates.filter((c) => c.group === group);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const id = extractShortId(mapsUrl);
  if (id) {
    const byUrl = candidates.find((c) => extractShortId(c.mapsUrl) === id);
    if (byUrl) return byUrl;
  }
  return candidates[0];
}
