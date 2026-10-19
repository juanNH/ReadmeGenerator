"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribeToMount = () => () => {};
const mountedSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeToggle() {
  const t = useTranslations("Controls");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToMount, mountedSnapshot, serverSnapshot);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("theme")}
      aria-pressed={mounted && resolvedTheme === "dark"}
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4.5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-4.5 dark:block" aria-hidden="true" />
    </Button>
  );
}
