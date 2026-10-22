import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export type SocialCardCopy = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  description: string;
  sectionsTitle: string;
  sections: readonly string[];
  note: string;
  footer: string;
};

const socialImageSize = { width: 1200, height: 630 };

export async function renderSocialCard(locale: AppLocale) {
  const t = await getTranslations({ locale, namespace: "SocialSharing" });
  const copy: SocialCardCopy = {
    eyebrow: t("eyebrow"),
    title: t("title"),
    titleAccent: t("titleAccent"),
    description: t("description"),
    sectionsTitle: t("sectionsTitle"),
    sections: [
      t("sectionAbout"),
      t("sectionTools"),
      t("sectionProjects"),
      t("sectionActivity"),
      t("sectionContact"),
    ],
    note: t("note"),
    footer: t("footer"),
  };

  return new ImageResponse(<SocialCard copy={copy} />, {
    ...socialImageSize,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export function SocialCard({ copy }: { copy: SocialCardCopy }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: 58,
        backgroundColor: "#101715",
        color: "#edf5ef",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -190,
          right: -130,
          width: 520,
          height: 520,
          borderRadius: 260,
          backgroundColor: "#183c2b",
          opacity: 0.72,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 390,
          bottom: -320,
          width: 470,
          height: 470,
          borderRadius: 235,
          border: "1px solid #34473b",
          opacity: 0.8,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          width: "58%",
          paddingRight: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "#85e2b5",
              color: "#092b1c",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            &lt;/&gt;
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
              GitHub Profile Generator
            </div>
            <div style={{ color: "#a9bab0", fontSize: 12, letterSpacing: 1.5 }}>{copy.eyebrow}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div
            style={{
              maxWidth: 600,
              fontSize: 48,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -1.8,
            }}
          >
            {copy.title}
          </div>
          <div
            style={{
              maxWidth: 600,
              marginTop: 6,
              color: "#85e2b5",
              fontSize: 48,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -1.8,
            }}
          >
            {copy.titleAccent}
          </div>
          <div
            style={{
              maxWidth: 510,
              marginTop: 22,
              color: "#a9bab0",
              fontSize: 20,
              lineHeight: 1.4,
            }}
          >
            {copy.description}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "9px 15px",
              borderRadius: 999,
              backgroundColor: "#183c2b",
              color: "#a2efca",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {copy.note}
          </div>
          <div style={{ color: "#a9bab0", fontSize: 13 }}>{copy.footer}</div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 390,
            boxSizing: "border-box",
            padding: 25,
            border: "1px solid #34473b",
            borderRadius: 20,
            backgroundColor: "#151f1a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#a9bab0", fontSize: 13, fontWeight: 600 }}>
              {copy.sectionsTitle}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#85e2b5" }} />
              <div style={{ color: "#a9bab0", fontSize: 11 }}>README.md</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 22 }}>
            {copy.sections.map((section, index) => (
              <div
                key={section}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 13px",
                  borderRadius: 11,
                  backgroundColor: index === 0 ? "#1e2a23" : "#18221d",
                  border: index === 0 ? "1px solid #34473b" : "1px solid #25352c",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: "#183c2b",
                    color: "#85e2b5",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div style={{ color: "#edf5ef", fontSize: 15, fontWeight: 600 }}>{section}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 19 }}>
            <div style={{ width: 26, height: 3, borderRadius: 2, backgroundColor: "#85e2b5" }} />
            <div style={{ width: 42, height: 3, borderRadius: 2, backgroundColor: "#34473b" }} />
            <div style={{ width: 19, height: 3, borderRadius: 2, backgroundColor: "#34473b" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
