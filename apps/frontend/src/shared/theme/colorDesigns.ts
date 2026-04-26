export const COLOR_DESIGN_STORAGE_KEY = "labordaten.colorDesign";

export const colorDesigns = [
  {
    key: "laborgruen",
    name: "Laborgrün",
    description: "Ruhiges Grün mit warmem Sandton",
    swatches: ["#1f6a53", "#b48a54", "#d9ebe4"]
  },
  {
    key: "kuestenblau",
    name: "Küstenblau",
    description: "Klares Blau mit hellem Kupferakzent",
    swatches: ["#235f84", "#b07a4f", "#d9e9f2"]
  },
  {
    key: "salbei",
    name: "Salbei",
    description: "Weiches Salbeigrün mit leiser Ockernote",
    swatches: ["#55745d", "#aa8543", "#e1ebdf"]
  },
  {
    key: "graphit",
    name: "Graphit",
    description: "Sachliches Graphit mit kühlem Türkis",
    swatches: ["#3f6671", "#b5835a", "#dde9eb"]
  },
  {
    key: "aubergine",
    name: "Aubergine",
    description: "Gedämpfter Beerenton mit Grünkontrast",
    swatches: ["#73516f", "#668057", "#eadfeb"]
  },
  {
    key: "bernstein",
    name: "Bernstein",
    description: "Warmer Bernstein mit petrolfarbenem Gegenpol",
    swatches: ["#9a6a25", "#2f6b73", "#f1e4cc"]
  },
  {
    key: "minze",
    name: "Minze",
    description: "Frische Minze mit gedecktem Blau",
    swatches: ["#2f7d70", "#526fa3", "#d9efea"]
  },
  {
    key: "ziegel",
    name: "Ziegel",
    description: "Warmer Ziegelton mit salbeigrünem Ausgleich",
    swatches: ["#9b5547", "#657f62", "#eedfd9"]
  },
  {
    key: "marine",
    name: "Marine",
    description: "Dunkles Marineblau mit hellem Messingakzent",
    swatches: ["#2d557a", "#b99758", "#dce7f0"]
  },
  {
    key: "pflaume",
    name: "Pflaume",
    description: "Ruhige Pflaume mit gedämpftem Blaugrün",
    swatches: ["#7a4f63", "#43747a", "#eadde3"]
  },
  {
    key: "neonnacht",
    name: "Neonnacht",
    description: "Dunkle Arbeitsfläche mit elektrischem Cyan und Pink",
    swatches: ["#00a8b5", "#d23f9a", "#1e3240"]
  },
  {
    key: "tropenlabor",
    name: "Tropenlabor",
    description: "Kräftiges Türkis mit Papaya und hellem Blattgrün",
    swatches: ["#008f83", "#e56b3c", "#dff2d0"]
  },
  {
    key: "synthwave",
    name: "Synthwave",
    description: "Satter Violettton mit Koralle und kühlem Blau",
    swatches: ["#6b4bb8", "#e45f7a", "#dfe5ff"]
  },
  {
    key: "polarlicht",
    name: "Polarlicht",
    description: "Leuchtendes Grünblau mit violettem Gegenakzent",
    swatches: ["#008c72", "#7d56c2", "#d8f1ee"]
  }
] as const;

export type ColorDesignKey = (typeof colorDesigns)[number]["key"];

const fallbackColorDesignKey: ColorDesignKey = "laborgruen";

export function isColorDesignKey(value: string | null | undefined): value is ColorDesignKey {
  return colorDesigns.some((design) => design.key === value);
}

export function getStoredColorDesignKey(): ColorDesignKey {
  if (typeof window === "undefined") {
    return fallbackColorDesignKey;
  }

  const storedValue = window.localStorage.getItem(COLOR_DESIGN_STORAGE_KEY);
  return isColorDesignKey(storedValue) ? storedValue : fallbackColorDesignKey;
}

export function applyColorDesign(key: ColorDesignKey) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.colorDesign = key;
}

export function storeAndApplyColorDesign(key: ColorDesignKey) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COLOR_DESIGN_STORAGE_KEY, key);
  }

  applyColorDesign(key);
}
