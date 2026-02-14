import { useState, useEffect } from "react";
import { Save, RotateCcw, Palette, Sun, Moon, Type, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ThemeValues {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  border: string;
  luxuryGold: string;
  luxuryGoldLight: string;
  luxuryGoldDark: string;
  radius: string;
  fontSerif: string;
  fontSans: string;
  headerHeight: string;
  containerMax: string;
}

const DEFAULT_THEME: ThemeValues = {
  background: "220 20% 4%",
  foreground: "40 20% 95%",
  card: "220 18% 7%",
  primary: "42 76% 55%",
  primaryForeground: "220 20% 4%",
  secondary: "220 15% 12%",
  muted: "220 15% 12%",
  mutedForeground: "220 10% 55%",
  accent: "220 15% 15%",
  border: "220 15% 15%",
  luxuryGold: "42 76% 55%",
  luxuryGoldLight: "42 76% 65%",
  luxuryGoldDark: "42 76% 40%",
  radius: "0.5rem",
  fontSerif: "'Playfair Display', serif",
  fontSans: "'Inter', system-ui, sans-serif",
  headerHeight: "4rem",
  containerMax: "70rem",
};

const PRESET_THEMES: Record<string, Partial<ThemeValues>> = {
  "Dark Gold (Default)": {},
  "Navy & Copper": {
    background: "220 40% 6%",
    card: "220 35% 9%",
    primary: "25 80% 55%",
    luxuryGold: "25 80% 55%",
    luxuryGoldLight: "25 80% 65%",
    luxuryGoldDark: "25 80% 40%",
    border: "220 30% 16%",
    secondary: "220 30% 13%",
  },
  "Charcoal & Emerald": {
    background: "0 0% 6%",
    card: "0 0% 9%",
    primary: "160 60% 45%",
    luxuryGold: "160 60% 45%",
    luxuryGoldLight: "160 60% 55%",
    luxuryGoldDark: "160 60% 35%",
    border: "0 0% 15%",
    secondary: "0 0% 12%",
  },
  "Cream & Navy": {
    background: "40 30% 95%",
    foreground: "220 30% 15%",
    card: "40 25% 90%",
    primary: "220 50% 40%",
    primaryForeground: "40 30% 95%",
    luxuryGold: "220 50% 40%",
    luxuryGoldLight: "220 50% 50%",
    luxuryGoldDark: "220 50% 30%",
    border: "40 15% 85%",
    secondary: "40 20% 88%",
    muted: "40 15% 88%",
    mutedForeground: "220 15% 50%",
  },
  "Slate & Rose": {
    background: "220 15% 8%",
    card: "220 12% 11%",
    primary: "350 65% 55%",
    luxuryGold: "350 65% 55%",
    luxuryGoldLight: "350 65% 65%",
    luxuryGoldDark: "350 65% 40%",
    border: "220 12% 16%",
    secondary: "220 12% 14%",
  },
};

const CSS_VAR_MAP: Record<keyof ThemeValues, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  border: "--border",
  luxuryGold: "--luxury-gold",
  luxuryGoldLight: "--luxury-gold-light",
  luxuryGoldDark: "--luxury-gold-dark",
  radius: "--radius",
  fontSerif: "--font-serif",
  fontSans: "--font-sans",
  headerHeight: "--header-height",
  containerMax: "--container-max",
};

export default function ThemeController() {
  const [theme, setTheme] = useState<ThemeValues>(DEFAULT_THEME);
  const [activePreset, setActivePreset] = useState("Dark Gold (Default)");
  const { toast } = useToast();

  // Read current CSS vars on mount
  useEffect(() => {
    const root = document.documentElement;
    const current = { ...DEFAULT_THEME };
    Object.entries(CSS_VAR_MAP).forEach(([key, cssVar]) => {
      const val = getComputedStyle(root).getPropertyValue(cssVar).trim();
      if (val) current[key as keyof ThemeValues] = val;
    });
    setTheme(current);
  }, []);

  const applyTheme = (values: ThemeValues) => {
    const root = document.documentElement;
    // Only apply HSL color values to CSS vars
    const colorKeys: (keyof ThemeValues)[] = [
      "background", "foreground", "card", "primary", "primaryForeground",
      "secondary", "muted", "mutedForeground", "accent", "border",
      "luxuryGold", "luxuryGoldLight", "luxuryGoldDark",
    ];
    colorKeys.forEach((key) => {
      root.style.setProperty(CSS_VAR_MAP[key], values[key]);
    });
    root.style.setProperty("--radius", values.radius);
    root.style.setProperty("--header-height", values.headerHeight);
    root.style.setProperty("--container-max", values.containerMax);
  };

  const handleChange = (key: keyof ThemeValues, value: string) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    applyTheme(updated);
  };

  const applyPreset = (name: string) => {
    const preset = PRESET_THEMES[name] || {};
    const merged = { ...DEFAULT_THEME, ...preset };
    setTheme(merged);
    setActivePreset(name);
    applyTheme(merged);
    toast({ title: "Theme applied", description: `"${name}" preset activated` });
  };

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
    setActivePreset("Dark Gold (Default)");
    applyTheme(DEFAULT_THEME);
    // Remove inline styles
    const root = document.documentElement;
    Object.values(CSS_VAR_MAP).forEach((cssVar) => {
      root.style.removeProperty(cssVar);
    });
    toast({ title: "Theme reset", description: "Reverted to defaults" });
  };

  const colorFields: { key: keyof ThemeValues; label: string; group: string }[] = [
    { key: "background", label: "Background", group: "Core" },
    { key: "foreground", label: "Foreground", group: "Core" },
    { key: "card", label: "Card", group: "Core" },
    { key: "primary", label: "Primary", group: "Brand" },
    { key: "primaryForeground", label: "Primary FG", group: "Brand" },
    { key: "luxuryGold", label: "Gold", group: "Brand" },
    { key: "luxuryGoldLight", label: "Gold Light", group: "Brand" },
    { key: "luxuryGoldDark", label: "Gold Dark", group: "Brand" },
    { key: "secondary", label: "Secondary", group: "Surface" },
    { key: "muted", label: "Muted", group: "Surface" },
    { key: "mutedForeground", label: "Muted FG", group: "Surface" },
    { key: "accent", label: "Accent", group: "Surface" },
    { key: "border", label: "Border", group: "Surface" },
  ];

  const groups = Array.from(new Set(colorFields.map((f) => f.group)));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground flex items-center gap-2">
            <Palette size={20} className="text-primary" /> Theme Controller
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Live preview — changes apply instantly</p>
        </div>
        <button onClick={resetTheme} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(PRESET_THEMES).map(([name, preset]) => {
            const merged = { ...DEFAULT_THEME, ...preset };
            const isActive = activePreset === name;
            return (
              <button
                key={name}
                onClick={() => applyPreset(name)}
                className={`p-3 rounded-lg border text-left transition-all ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full border border-border" style={{ background: `hsl(${merged.background})` }} />
                  <div className="w-4 h-4 rounded-full border border-border" style={{ background: `hsl(${merged.primary})` }} />
                  <div className="w-4 h-4 rounded-full border border-border" style={{ background: `hsl(${merged.foreground})` }} />
                </div>
                <span className="text-xs font-medium text-foreground">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color tokens */}
      {groups.map((group) => (
        <div key={group} className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group} Colors</h3>
          <div className="grid grid-cols-2 gap-3">
            {colorFields.filter((f) => f.group === group).map((field) => (
              <div key={field.key} className="glass-surface rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded border border-border shrink-0" style={{ background: `hsl(${theme[field.key]})` }} />
                  <span className="text-xs font-medium text-foreground">{field.label}</span>
                </div>
                <input
                  type="text"
                  value={theme[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder="H S% L%"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Layout tokens */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Maximize2 size={12} /> Layout
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-surface rounded-lg p-3">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Border Radius</label>
            <input
              type="text"
              value={theme.radius}
              onChange={(e) => handleChange("radius", e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="glass-surface rounded-lg p-3">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Header Height</label>
            <input
              type="text"
              value={theme.headerHeight}
              onChange={(e) => handleChange("headerHeight", e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="glass-surface rounded-lg p-3">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Max Container</label>
            <input
              type="text"
              value={theme.containerMax}
              onChange={(e) => handleChange("containerMax", e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Type size={12} /> Typography
        </h3>
        <div className="space-y-3">
          <div className="glass-surface rounded-lg p-3">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Serif Font</label>
            <input
              type="text"
              value={theme.fontSerif}
              onChange={(e) => handleChange("fontSerif", e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="glass-surface rounded-lg p-3">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Sans Font</label>
            <input
              type="text"
              value={theme.fontSans}
              onChange={(e) => handleChange("fontSans", e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
        <strong>Note:</strong> Theme changes are live-previewed. To persist them, save the CSS values to your CMS settings or codebase.
      </div>
    </div>
  );
}
