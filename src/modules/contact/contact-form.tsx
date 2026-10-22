import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Link as LinkIcon, Mail, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { contactProviders, findContactProvider } from "@/core/contact";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";

type ContactFormProps = {
  value: ProfileModuleData["contact"];
  errors: readonly ReadmeIssue[];
  onChange: (value: ProfileModuleData["contact"]) => void;
};

export function ContactForm({ value, errors, onChange }: ContactFormProps) {
  const t = useTranslations("Editor.contact");
  const providersT = useTranslations("ContactProviders");
  const baseId = useId();
  const [providerHints, setProviderHints] = useState(new Map<string, string>());
  const selectorRefs = useRef(new Map<string, HTMLSelectElement>());
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (pendingFocusId.current !== null) {
      selectorRefs.current.get(pendingFocusId.current)?.focus();
      pendingFocusId.current = null;
    }
  }, [value.links]);

  function addLink() {
    const id = crypto.randomUUID();
    pendingFocusId.current = id;
    onChange({ links: [...value.links, { id, label: "", url: "" }] });
  }

  function removeLink(id: string, index: number) {
    const nextLink = value.links[index + 1] ?? value.links[index - 1];
    if (nextLink) inputRefs.current.get(nextLink.id)?.focus();
    else addButtonRef.current?.focus();
    setProviderHints((hints) => {
      const nextHints = new Map(hints);
      nextHints.delete(id);
      return nextHints;
    });
    onChange({ links: value.links.filter((link) => link.id !== id) });
  }

  function editLink(id: string, key: "label" | "url", text: string) {
    onChange({
      links: value.links.map((link) => (link.id === id ? { ...link, [key]: text } : link)),
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">{providersT("providerHelp")}</p>
      {value.links.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface-raised/40 px-4 py-5 text-sm leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      {value.links.map((link, index) => {
        const controlId = `${baseId}-link-${index}`;
        const provider = findContactProvider(link.url);
        const email = /^mailto:/i.test(link.url);
        const selectedProvider =
          providerHints.get(link.id) ??
          provider?.id ??
          (email ? "email" : link.url ? "custom" : "");
        const hintedProvider = contactProviders.find((entry) => entry.id === selectedProvider);
        const placeholder =
          selectedProvider === "email"
            ? "mailto:hello@example.com"
            : (hintedProvider?.placeholder ?? t("urlPlaceholder"));
        const hasUrlError = errors.some(
          (error) =>
            error.code === "invalid_url" &&
            error.path[0] === "data" &&
            error.path[1] === "contact" &&
            error.path[2] === "links" &&
            error.path[3] === index &&
            error.path[4] === "url",
        );

        return (
          <fieldset key={link.id} className="min-w-0 space-y-4 rounded-lg border border-border p-4">
            <legend className="max-w-full px-1 text-sm font-medium">
              <span className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-2">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-800"
                  aria-hidden="true"
                >
                  {provider ? (
                    <Image src={provider.iconPath} width={20} height={20} alt="" unoptimized />
                  ) : email ? (
                    <Mail className="size-5" />
                  ) : (
                    <LinkIcon className="size-5" />
                  )}
                </span>
                {t("entry", { number: index + 1 })}
                {provider && <span className="text-muted-foreground">· {provider.name}</span>}
              </span>
            </legend>
            <Field htmlFor={`${controlId}-provider`} label={providersT("provider")}>
              <select
                ref={(selector) => {
                  if (selector) selectorRefs.current.set(link.id, selector);
                  else selectorRefs.current.delete(link.id);
                }}
                value={selectedProvider}
                onChange={(event) => {
                  const providerId = event.target.value;
                  setProviderHints((hints) => new Map(hints).set(link.id, providerId));
                }}
                className="min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:outline-none sm:text-sm"
              >
                <option value="" disabled>
                  {providersT("choose")}
                </option>
                {contactProviders.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
                <option value="custom">{providersT("custom")}</option>
                <option value="email">{providersT("email")}</option>
              </select>
            </Field>
            <Field
              htmlFor={`${controlId}-url`}
              label={t("url")}
              description={t("urlHelp")}
              error={hasUrlError ? t("invalidUrl") : undefined}
            >
              <Input
                ref={(input) => {
                  if (input) inputRefs.current.set(link.id, input);
                  else inputRefs.current.delete(link.id);
                }}
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                value={link.url}
                placeholder={placeholder}
                onChange={(event) => editLink(link.id, "url", event.target.value)}
              />
            </Field>
            <details className="group">
              <summary className="cursor-pointer rounded-sm py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                {providersT("details")}
              </summary>
              <Field
                htmlFor={`${controlId}-label`}
                label={t("label")}
                description={providersT("labelHelp")}
                className="pt-3"
              >
                <Input
                  data-emoji-target="true"
                  value={link.label}
                  placeholder={provider?.name ?? t("labelPlaceholder")}
                  onChange={(event) => editLink(link.id, "label", event.target.value)}
                />
              </Field>
            </details>
            <Button
              variant="ghost"
              onClick={() => removeLink(link.id, index)}
              aria-label={t("remove", { number: index + 1 })}
            >
              <Trash2 aria-hidden="true" />
              {t("removeVisible")}
            </Button>
          </fieldset>
        );
      })}
      <Button ref={addButtonRef} variant="outline" onClick={addLink}>
        <Plus aria-hidden="true" />
        {t("add")}
      </Button>
    </div>
  );
}
