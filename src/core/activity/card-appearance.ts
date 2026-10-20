import type { CardAppearance } from "../profile/module-content";
import { extendedThemes } from "./extended-themes";

const accents = {
  forest: {
    light: ["#185c36", "#327c50", "#64a77c", "#acd4b7", "#ebf0ec"],
    dark: ["#b6ebc8", "#79c994", "#4a9b68", "#28563b", "#1c3025"],
  },
  ocean: {
    light: ["#075985", "#0369a1", "#38a1c7", "#a5d8eb", "#e6f2f7"],
    dark: ["#b2e4fb", "#70c6ed", "#378eb5", "#244f68", "#192e3b"],
  },
  violet: {
    light: ["#653c98", "#8054b3", "#a884ce", "#d6c2eb", "#f0eaf7"],
    dark: ["#e0c7ff", "#c09be5", "#9365bb", "#513467", "#302539"],
  },
} as const;

/** Validated visual tokens only: no caller-supplied CSS, markup or external URLs. */
export function resolveCardAppearance(appearance: CardAppearance = {}) {
  const theme = appearance.theme ?? "light";
  const palette = appearance.palette ?? "forest";
  const design = appearance.design ?? "classic";
  const size = appearance.size ?? "compact";
  const tones = accents[palette][theme];
  const preset = appearance.preset ? extendedThemes[appearance.preset] : undefined;
  const presetBackground = preset?.bg_color.split(",");
  const gradient =
    appearance.backgroundGradient ??
    (!appearance.backgroundColor && presetBackground && presetBackground.length > 1
      ? {
          angle: Number(presetBackground[0]),
          colors: presetBackground.slice(1).map((value) => `#${value}`),
        }
      : undefined);
  const textColor = appearance.textColor ?? (preset ? `#${preset.text_color}` : undefined);
  const title = appearance.titleColor ?? (preset ? `#${preset.title_color}` : tones[0]);
  const icon = appearance.iconColor ?? (preset ? `#${preset.icon_color}` : tones[1]);
  return {
    theme,
    palette,
    design,
    size,
    width: appearance.width ?? (size === "wide" ? 1000 : 700),
    background: gradient
      ? "url(#card-background)"
      : (appearance.backgroundColor ??
        (preset ? `#${preset.bg_color}` : theme === "dark" ? "#111b20" : "#fbfdfb")),
    foreground: textColor ?? (theme === "dark" ? "#edf4f0" : "#18392b"),
    muted: textColor ?? (theme === "dark" ? "#b0c1bd" : "#4d6157"),
    border:
      appearance.borderColor ??
      (preset && "border_color" in preset
        ? `#${preset.border_color}`
        : theme === "dark"
          ? "#465a59"
          : "#cad6ce"),
    warning: theme === "dark" ? "#f0c98c" : "#80541c",
    panel: theme === "dark" ? "#1b2a2e" : "#edf4ef",
    accent: icon,
    strong: title,
    title,
    icon,
    radius: appearance.borderRadius ?? 14,
    lineHeight: appearance.lineHeight ?? 28,
    customTitle: appearance.customTitle,
    hideTitle: appearance.hideTitle === true,
    hideBorder: appearance.hideBorder === true,
    showIcons: appearance.showIcons === true,
    textBold: appearance.textBold ?? true,
    numberFormat: appearance.numberFormat ?? "long",
    numberPrecision: appearance.numberPrecision ?? 1,
    gradient,
    heatmap: [tones[4], tones[3], tones[2], tones[1], tones[0]],
  };
}

export type ResolvedCardAppearance = ReturnType<typeof resolveCardAppearance>;

/** Passive SVG background from validated colors, never CSS or an external URL. */
export function cardBackground(appearance: ResolvedCardAppearance, height: number): string {
  const { gradient, width, background, border, radius, hideBorder } = appearance;
  let definitions = "";
  if (gradient) {
    const radians = (gradient.angle * Math.PI) / 180;
    const x = Math.cos(radians) / 2,
      y = Math.sin(radians) / 2;
    definitions = `<defs><linearGradient id="card-background" x1="${(0.5 - x).toFixed(5)}" y1="${(0.5 - y).toFixed(5)}" x2="${(0.5 + x).toFixed(5)}" y2="${(0.5 + y).toFixed(5)}">${gradient.colors.map((color, index) => `<stop offset="${(index / (gradient.colors.length - 1)).toFixed(5)}" stop-color="${color}"/>`).join("")}</linearGradient></defs>`;
  }
  return `${definitions}<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}" fill="${background}" stroke="${hideBorder ? "none" : border}"/>`;
}
