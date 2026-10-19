import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  formatCountryLocation,
  parseCountryLocation,
  searchCountries,
  type Country,
} from "@/core/location";

type LocationFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LocationField({ value, onChange }: LocationFieldProps) {
  const t = useTranslations("Editor.presentation");
  const locale = useLocale();
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const selected = parseCountryLocation(value);
  const query = selected?.text ?? value;
  const results = searchCountries(query, locale);
  const highlightedIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
  const expanded = open && results.length > 0;
  const listId = `${baseId}-countries`;

  useEffect(() => {
    if (open)
      listRef.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex, query]);

  function selectCountry(country: Country) {
    onChange(formatCountryLocation(country, locale));
    setOpen(false);
    setActiveIndex(0);
    setAnnouncement(t("countrySelected", { name: country.name[locale] }));
    inputRef.current?.focus();
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Field htmlFor="profile-location" label={t("location")} description={t("locationHelp")}>
        <Input
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded ? `${baseId}-country-${highlightedIndex}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={t("locationPlaceholder")}
          className={selected ? "pl-11" : undefined}
          style={
            selected
              ? {
                  backgroundImage: `url("${selected.country.iconPath}")`,
                  backgroundSize: "20px 15px",
                  backgroundPosition: "12px center",
                  backgroundRepeat: "no-repeat",
                }
              : undefined
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(0);
            setAnnouncement("");
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (results.length > 0) {
                const direction = event.key === "ArrowDown" ? 1 : -1;
                setActiveIndex(
                  open ? (highlightedIndex + direction + results.length) % results.length : 0,
                );
              }
            } else if (event.key === "Enter" && expanded) {
              event.preventDefault();
              const country = results[highlightedIndex];
              if (country) selectCountry(country);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "Tab") {
              setOpen(false);
            }
          }}
        />
      </Field>
      {expanded && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("countrySuggestions")}
          className="absolute top-full z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface p-1.5 shadow-soft"
        >
          {results.map((country, index) => (
            <li key={country.code} role="none">
              <button
                type="button"
                id={`${baseId}-country-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                tabIndex={-1}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-raised aria-selected:bg-surface-raised"
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => selectCountry(country)}
              >
                <Image
                  src={country.iconPath}
                  width={20}
                  height={15}
                  alt=""
                  unoptimized
                  className="h-[15px] w-5 shrink-0 rounded-[2px]"
                />
                <span className="min-w-0 flex-1 break-words">{country.name[locale]}</span>
                {index === highlightedIndex && (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("countryNoResults")}</p>
      )}
      <p role="status" className="sr-only">
        {open && results.length === 0 ? t("countryNoResults") : announcement}
      </p>
    </div>
  );
}
