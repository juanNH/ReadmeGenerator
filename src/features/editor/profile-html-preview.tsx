"use client";

import { createElement, type ReactNode } from "react";
import type { Element, Root, RootContent } from "hast";
import { useTranslations } from "next-intl";
import type { CustomHtmlFragment } from "@/core/readme";
import { normalizePublicImageUrl } from "@/core/readme/public-image";
import { normalizeWebUrl } from "@/core/readme/web-url";
import { PublicProfileImage } from "./public-profile-image";

const allowedTags = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "span",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "details",
  "summary",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "b",
  "em",
  "i",
  "del",
  "s",
  "kbd",
  "sub",
  "sup",
  "br",
  "hr",
]);

function positiveInteger(value: unknown, maximum = 2000): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(number) && number > 0 && number <= maximum ? number : undefined;
}

function imageWidth(value: unknown): number | string | undefined {
  if (typeof value === "string" && /^(?:[1-9]\d?|100)%$/.test(value)) return value;
  return positiveInteger(value);
}

function headingDepth(node: RootContent): number | null {
  return node.type === "element" && /^h[1-6]$/.test(node.tagName) ? Number(node.tagName[1]) : null;
}

function minimumHeadingDepth(tree: Root): number {
  let minimum = 6;
  const pending: RootContent[] = [...tree.children];
  while (pending.length) {
    const node = pending.pop();
    if (!node) continue;
    const depth = headingDepth(node);
    if (depth !== null) minimum = Math.min(minimum, depth);
    if (node.type === "element") pending.push(...node.children);
  }
  return minimum;
}

function previewHeadingLevels(tree: Root, base: number): Map<Element, number> {
  const minimum = minimumHeadingDepth(tree);
  const levels = new Map<Element, number>();
  const sequence = { previous: base - 1 };
  const pending = [...tree.children].reverse().map((node) => ({ node, sequence }));
  while (pending.length) {
    const entry = pending.pop();
    if (!entry || entry.node.type !== "element") continue;
    const { node, sequence: current } = entry;
    const depth = headingDepth(node);
    if (depth !== null) {
      const level = Math.min(6, current.previous + 1, base + depth - minimum);
      levels.set(node, level);
      current.previous = level;
    }
    const childSequence = node.tagName === "details" ? { previous: current.previous } : current;
    pending.push(
      ...[...node.children].reverse().map((child) => ({ node: child, sequence: childSequence })),
    );
  }
  return levels;
}

/** Render the sanitized tree with a closed React mapping; never inject an HTML string. */
export function ProfileHtmlPreview({ fragment }: { fragment: CustomHtmlFragment }) {
  const t = useTranslations("Editor.preview");
  const headingLevels = previewHeadingLevels(fragment.tree, fragment.headingLevel);

  function renderNode(node: RootContent, path: string, insideLink = false): ReactNode {
    if (node.type === "text") return node.value;
    if (node.type !== "element" || !allowedTags.has(node.tagName)) return null;
    const properties = node.properties;
    const title = typeof properties.title === "string" ? properties.title : undefined;
    const align =
      properties.align === "center"
        ? "text-center"
        : properties.align === "right"
          ? "text-right"
          : properties.align === "left"
            ? "text-left"
            : "";
    const common = { title };
    const children = (linked = insideLink) =>
      node.children.map((child, index) => renderNode(child, `${path}.${index}`, linked));

    if (node.tagName === "img") {
      const src =
        typeof properties.src === "string" ? normalizePublicImageUrl(properties.src) : null;
      if (!src || typeof properties.alt !== "string") return null;
      return (
        <PublicProfileImage
          key={`${path}:${src}`}
          src={src}
          alt={properties.alt}
          width={imageWidth(properties.width)}
          height={positiveInteger(properties.height)}
          inline
          linked={insideLink}
        />
      );
    }
    if (node.tagName === "a") {
      const href = typeof properties.href === "string" ? normalizeWebUrl(properties.href) : null;
      const label = typeof properties.ariaLabel === "string" ? properties.ariaLabel : undefined;
      return href ? (
        <a
          key={path}
          {...common}
          href={href}
          aria-label={label}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children(true)}
        </a>
      ) : (
        <span key={path} {...common}>
          {children()}
        </span>
      );
    }

    const depth = headingDepth(node);
    if (depth !== null) {
      const level = headingLevels.get(node) ?? fragment.headingLevel;
      const scale =
        depth === 1 ? "text-2xl" : depth === 2 ? "text-xl" : depth === 3 ? "text-lg" : "text-base";
      return createElement(
        `h${level}`,
        {
          key: path,
          ...common,
          className: `mt-5 mb-3 font-semibold leading-tight ${scale} ${align}`,
        },
        children(),
      );
    }
    if (node.tagName === "table") {
      return (
        <div
          key={path}
          role="group"
          aria-label={t("htmlTable")}
          tabIndex={insideLink ? undefined : 0}
          className="my-4 max-w-full overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <table
            title={title}
            align={
              properties.align === "center" ||
              properties.align === "right" ||
              properties.align === "left"
                ? properties.align
                : undefined
            }
            className="w-full border-collapse text-left text-sm"
          >
            {children()}
          </table>
        </div>
      );
    }
    if (node.tagName === "th" || node.tagName === "td") {
      return createElement(
        node.tagName,
        {
          key: path,
          ...common,
          colSpan: positiveInteger(properties.colSpan, 100),
          rowSpan: positiveInteger(properties.rowSpan, 100),
          scope:
            node.tagName === "th" &&
            ["row", "col", "rowgroup", "colgroup"].includes(String(properties.scope))
              ? String(properties.scope)
              : undefined,
          className: `border border-border px-3 py-2 align-top ${node.tagName === "th" ? "bg-surface-raised font-semibold" : ""} ${align}`,
        },
        children(),
      );
    }
    if (node.tagName === "details")
      return (
        <details
          key={path}
          {...common}
          open={properties.open === true || undefined}
          className="my-4 rounded-md border border-border p-3"
        >
          {children()}
        </details>
      );
    if (node.tagName === "summary")
      return (
        <summary
          key={path}
          {...common}
          className="cursor-pointer rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {children()}
        </summary>
      );
    if (node.tagName === "pre")
      return (
        <pre
          key={path}
          {...common}
          tabIndex={insideLink ? undefined : 0}
          className="my-4 max-w-full overflow-x-auto rounded-md bg-surface-raised p-4 font-mono text-xs leading-6 whitespace-pre focus-visible:outline-2 focus-visible:outline-ring"
        >
          {children()}
        </pre>
      );
    if (node.tagName === "ol")
      return (
        <ol
          key={path}
          {...common}
          start={
            typeof properties.start === "number" && Number.isSafeInteger(properties.start)
              ? properties.start
              : undefined
          }
          className="my-3 list-decimal pl-6"
        >
          {children()}
        </ol>
      );
    if (node.tagName === "ul")
      return (
        <ul key={path} {...common} className="my-3 list-disc pl-6">
          {children()}
        </ul>
      );
    if (node.tagName === "hr") return <hr key={path} {...common} className="my-5 border-border" />;
    if (node.tagName === "br") return <br key={path} {...common} />;
    return createElement(
      node.tagName,
      { key: path, ...common, className: elementClassName(node, align) },
      children(),
    );
  }

  return (
    <div className="max-w-full min-w-0 [overflow-wrap:anywhere]">
      {fragment.tree.children.map((node, index) => renderNode(node, String(index)))}
    </div>
  );
}

function elementClassName(node: Element, align: string) {
  const tag = node.tagName;
  const base =
    tag === "p"
      ? "my-3"
      : tag === "blockquote"
        ? "my-4 border-l-4 border-accent/50 pl-4 text-muted-foreground"
        : tag === "caption"
          ? "mb-2 text-left font-medium"
          : tag === "code" || tag === "kbd"
            ? "rounded bg-surface-raised px-1 font-mono text-[0.9em]"
            : "";
  return `${base} ${align}`.trim() || undefined;
}
