import { hasLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { renderSocialCard } from "@/features/social-sharing/social-card";

type SocialPreviewRouteProps = { params: Promise<{ locale: string }> };

export async function GET(_request: Request, { params }: SocialPreviewRouteProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response(null, { status: 404 });

  return renderSocialCard(locale as AppLocale);
}
