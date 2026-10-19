"use client";

import { useState } from "react";
import { Check, CircleAlert, Code2, GitPullRequest, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export function ButtonDemo() {
  const t = useTranslations("DesignSystem");
  const [action, setAction] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="space-y-6 pt-5 sm:pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setAction(t("buttons.primary"))}>
            <Plus aria-hidden="true" />
            {t("buttons.primary")}
          </Button>
          <Button variant="secondary" onClick={() => setAction(t("buttons.secondary"))}>
            {t("buttons.secondary")}
          </Button>
          <Button variant="outline" onClick={() => setAction(t("buttons.outline"))}>
            {t("buttons.outline")}
          </Button>
          <Button variant="ghost" onClick={() => setAction(t("buttons.ghost"))}>
            {t("buttons.ghost")}
          </Button>
          <Button variant="destructive" onClick={() => setAction(t("buttons.destructive"))}>
            {t("buttons.destructive")}
          </Button>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setAction(t("buttons.small"))}>
            {t("buttons.small")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => setAction(t("buttons.large"))}>
            {t("buttons.large")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("buttons.icon")}
            onClick={() => setAction(t("buttons.icon"))}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button disabled aria-describedby="publish-disabled-reason">
            {t("buttons.disabled")}
          </Button>
        </div>
        <p id="publish-disabled-reason" className="text-xs leading-5 text-muted-foreground">
          {t("buttons.disabledReason")}
        </p>
      </CardContent>
      <CardFooter>
        <p role="status" className="min-h-5 text-xs leading-5 text-muted-foreground">
          {action ? t("buttons.feedback", { action }) : t("buttons.hint")}
        </p>
      </CardFooter>
    </Card>
  );
}

export function FieldDemo() {
  const t = useTranslations("DesignSystem");

  return (
    <Card>
      <CardContent className="space-y-6 pt-5 sm:pt-6">
        <p className="text-xs leading-5 text-muted-foreground">{t("fields.requiredHint")}</p>
        <div className="grid gap-6 md:grid-cols-2">
          <Field
            htmlFor="demo-display-name"
            label={t("fields.name")}
            description={t("fields.nameHint")}
            required
          >
            <Input defaultValue="Juan" autoComplete="off" />
          </Field>
          <Field
            htmlFor="demo-contact"
            label={t("fields.contact")}
            description={t("fields.contactHint")}
            error={t("fields.contactError")}
          >
            <Input type="url" defaultValue="linkedin" autoComplete="off" spellCheck={false} />
          </Field>
          <Field
            htmlFor="demo-bio"
            label={t("fields.bio")}
            description={t("fields.bioHint")}
            className="md:col-span-2"
          >
            <Textarea defaultValue={t("fields.bioValue")} />
          </Field>
          <Field
            htmlFor="demo-identifier"
            label={t("fields.disabled")}
            description={t("fields.disabledHint")}
          >
            <Input defaultValue="profile-demo" disabled />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

export function BadgeDemo() {
  const t = useTranslations("DesignSystem");
  return (
    <Card>
      <CardContent className="space-y-5 pt-5 sm:pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t("badges.neutral")}</Badge>
          <Badge variant="accent">{t("badges.accent")}</Badge>
          <Badge variant="success">
            <Check aria-hidden="true" />
            {t("badges.success")}
          </Badge>
          <Badge variant="warning">
            <CircleAlert aria-hidden="true" />
            {t("badges.warning")}
          </Badge>
          <Badge variant="outline">{t("badges.outline")}</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t("badges.caption")}</p>
      </CardContent>
    </Card>
  );
}

export function ModuleDemo() {
  const t = useTranslations("DesignSystem");
  const [showTechnologies, setShowTechnologies] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [compact, setCompact] = useState(false);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("modules.controlsTitle")}</CardTitle>
          <CardDescription>{t("modules.controlsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="demo-show-technologies"
              checked={showTechnologies}
              onCheckedChange={(checked) => setShowTechnologies(checked === true)}
              aria-describedby="demo-tech-description"
              aria-controls="demo-profile-preview"
            />
            <div className="min-w-0 pt-2.5">
              <Label htmlFor="demo-show-technologies" className="cursor-pointer">
                {t("modules.technologies")}
              </Label>
              <p
                id="demo-tech-description"
                className="mt-1 text-xs leading-5 text-muted-foreground"
              >
                {t("modules.technologiesHint")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="demo-show-activity"
              checked={showActivity}
              onCheckedChange={(checked) => setShowActivity(checked === true)}
              aria-describedby="demo-activity-description"
              aria-controls="demo-profile-preview"
            />
            <div className="min-w-0 pt-2.5">
              <Label htmlFor="demo-show-activity" className="cursor-pointer">
                {t("modules.activity")}
              </Label>
              <p
                id="demo-activity-description"
                className="mt-1 text-xs leading-5 text-muted-foreground"
              >
                {t("modules.activityHint")}
              </p>
            </div>
          </div>
          <Separator className="my-5" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-2.5">
              <Label htmlFor="demo-compact" className="cursor-pointer">
                {t("modules.compact")}
              </Label>
              <p
                id="demo-compact-description"
                className="mt-1 text-xs leading-5 text-muted-foreground"
              >
                {t("modules.compactHint")}
              </p>
            </div>
            <Switch
              id="demo-compact"
              checked={compact}
              onCheckedChange={setCompact}
              aria-describedby="demo-compact-description"
              aria-controls="demo-profile-preview"
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-2.5">
              <Label htmlFor="demo-disabled-switch">{t("modules.disabled")}</Label>
              <p
                id="demo-switch-disabled-reason"
                className="mt-1 text-xs leading-5 text-muted-foreground"
              >
                {t("modules.disabledReason")}
              </p>
            </div>
            <Switch
              id="demo-disabled-switch"
              disabled
              aria-describedby="demo-switch-disabled-reason"
            />
          </div>
        </CardContent>
      </Card>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-xs font-medium text-muted-foreground">{t("modules.preview")}</p>
          <Badge variant="outline">{t("modules.sample")}</Badge>
        </div>
        <Card id="demo-profile-preview" role="region" aria-label={t("modules.preview")}>
          <div className={cn("space-y-6 p-6 sm:p-8", compact && "space-y-4 p-5 sm:p-5")}>
            <div className="flex items-start gap-4">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft font-mono text-lg font-medium text-accent-soft-foreground"
                aria-hidden="true"
              >
                J.
              </span>
              <div className="min-w-0">
                <h3 className="text-xl font-semibold tracking-tight">Juan</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("modules.role")}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{t("modules.bio")}</p>
            {showTechnologies && (
              <div className="space-y-3" data-testid="demo-technologies-module">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <Code2 className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t("modules.techTitle")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {["React", "TypeScript", "Node.js"].map((technology) => (
                    <Badge key={technology} variant="outline">
                      {technology}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {showActivity && (
              <div
                className="space-y-3 rounded-md border border-border bg-background p-4"
                data-testid="demo-activity-module"
              >
                <p className="flex items-center gap-2 text-xs font-medium">
                  <GitPullRequest className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t("modules.activityTitle")}
                </p>
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium tracking-tight">
                    {t("modules.activityValue")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("modules.activityLabel")}
                  </span>
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("modules.activityNote")}
                </p>
              </div>
            )}
          </div>
          <CardFooter className="bg-background/50">
            <p className="text-xs leading-5 text-muted-foreground">{t("modules.footer")}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export function FeedbackDemo() {
  const t = useTranslations("DesignSystem");
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("feedback.loading")}</CardTitle>
          <CardDescription>{t("feedback.loadingHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3" aria-hidden="true">
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="w-full space-y-2.5">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <div className="mt-6 space-y-2.5" aria-hidden="true">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">{t("feedback.motion")}</p>
        </CardContent>
      </Card>
      <Card className="border-accent/25 bg-accent-soft">
        <CardHeader>
          <span className="mb-2 flex size-10 items-center justify-center rounded-md border border-accent/20 bg-surface/50 text-accent-soft-foreground">
            <Check className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="text-accent-soft-foreground">{t("feedback.ready")}</CardTitle>
          <CardDescription className="text-accent-soft-foreground">
            {t("feedback.readyBody")}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
