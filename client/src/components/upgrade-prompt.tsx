import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, X, ArrowRight, Check } from "lucide-react";
import { BETA_INFO, TIER_CONFIG } from "@shared/tier-config";
import { isPaywallEnabled } from "@shared/tier-utils";

interface UpgradePromptProps {
  feature: string;
  title?: string;
  description?: string;
  onDismiss?: () => void;
  variant?: "modal" | "inline" | "banner";
}

export function UpgradePrompt({ 
  feature, 
  title, 
  description,
  onDismiss,
  variant = "inline" 
}: UpgradePromptProps) {
  const paywallEnabled = isPaywallEnabled();
  
  if (!paywallEnabled) {
    return null;
  }

  const proConfig = TIER_CONFIG.pro;

  if (variant === "banner") {
    return (
      <div 
        className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-md p-3 flex items-center justify-between gap-4"
        data-testid="upgrade-prompt-banner"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{title || `Upgrade to unlock ${feature}`}</p>
            <p className="text-xs text-muted-foreground">{description || proConfig.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-upgrade">
            Upgrade
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss} data-testid="button-dismiss-upgrade">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <Card className="border-amber-500/30" data-testid="upgrade-prompt-modal">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{title || "Upgrade to Pro"}</CardTitle>
                <CardDescription>{proConfig.description}</CardDescription>
              </div>
            </div>
            {onDismiss && (
              <Button variant="ghost" size="icon" onClick={onDismiss}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {description || `${feature} is a Pro feature. Upgrade to unlock:`}
          </p>
          <ul className="space-y-2 mb-4">
            {BETA_INFO.upcomingProFeatures.slice(0, 5).map((feat, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                {feat}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" data-testid="button-upgrade-pro">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
            {proConfig.price && (
              <span className="text-sm text-muted-foreground">
                ${proConfig.price.monthly}/mo
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20"
      data-testid="upgrade-prompt-inline"
    >
      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-sm text-muted-foreground flex-1">
        {description || `${feature} requires Pro`}
      </span>
      <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400" data-testid="button-upgrade">
        Upgrade
      </Button>
    </div>
  );
}

interface UpgradeTeaserProps {
  features: string[];
  className?: string;
}

export function UpgradeTeaser({ features, className = "" }: UpgradeTeaserProps) {
  return (
    <div className={`rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-4 ${className}`} data-testid="upgrade-teaser">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Coming with Pro</span>
      </div>
      <ul className="space-y-1.5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-3 h-3 text-amber-500/50" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
