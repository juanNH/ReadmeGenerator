import { useEffect, useId, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";

type ContactFormProps = {
  value: ProfileModuleData["contact"];
  errors: readonly ReadmeIssue[];
  onChange: (value: ProfileModuleData["contact"]) => void;
};

export function ContactForm({ value, errors, onChange }: ContactFormProps) {
  const t = useTranslations("Editor.contact");
  const baseId = useId();
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (pendingFocusId.current !== null) {
      inputRefs.current.get(pendingFocusId.current)?.focus();
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
    onChange({ links: value.links.filter((link) => link.id !== id) });
  }

  function editLink(id: string, key: "label" | "url", text: string) {
    onChange({
      links: value.links.map((link) => (link.id === id ? { ...link, [key]: text } : link)),
    });
  }

  return (
    <div className="space-y-5">
      {value.links.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface-raised/40 px-4 py-5 text-sm leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      {value.links.map((link, index) => {
        const controlId = `${baseId}-link-${index}`;
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
          <fieldset key={link.id} className="min-w-0 space-y-4 border-t border-border pt-4">
            <legend className="px-1 text-sm font-medium">
              {t("entry", { number: index + 1 })}
            </legend>
            <Field htmlFor={`${controlId}-label`} label={t("label")} description={t("labelHelp")}>
              <Input
                ref={(input) => {
                  if (input) inputRefs.current.set(link.id, input);
                  else inputRefs.current.delete(link.id);
                }}
                value={link.label}
                placeholder={t("labelPlaceholder")}
                onChange={(event) => editLink(link.id, "label", event.target.value)}
              />
            </Field>
            <Field
              htmlFor={`${controlId}-url`}
              label={t("url")}
              description={t("urlHelp")}
              error={hasUrlError ? t("invalidUrl") : undefined}
            >
              <Input
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                value={link.url}
                placeholder={t("urlPlaceholder")}
                onChange={(event) => editLink(link.id, "url", event.target.value)}
              />
            </Field>
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
