import { Badge } from "@/components/ui/badge";
import { Crown, Lock } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface ProBadgeProps {
  variant?: "inline" | "corner" | "small";
  showTooltip?: boolean;
  tooltipText?: string;
  className?: string;
}

export function ProBadge({ 
  variant = "inline", 
  showTooltip = true,
  tooltipText = "This feature will be available with Pro plan",
  className = ""
}: ProBadgeProps) {
  const badge = (
    <Badge 
      variant="secondary" 
      className={`
        bg-gradient-to-r from-amber-500/20 to-orange-500/20 
        text-amber-600 dark:text-amber-400 
        border-amber-500/30
        ${variant === "small" ? "text-[10px] px-1.5 py-0" : "text-xs"}
        ${variant === "corner" ? "absolute -top-1 -right-1" : ""}
        ${className}
      `}
      data-testid="badge-pro"
    >
      <Crown className={variant === "small" ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-1"} />
      PRO
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ProLockedOverlayProps {
  feature: string;
  description?: string;
}

export function ProLockedOverlay({ feature, description }: ProLockedOverlayProps) {
  return (
    <div 
      className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-md"
      data-testid="overlay-pro-locked"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Lock className="w-5 h-5" />
        <span className="font-medium">Pro Feature</span>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {description || `${feature} requires a Pro plan`}
      </p>
      <p className="text-xs text-muted-foreground/70 mt-2">
        Coming soon after beta
      </p>
    </div>
  );
}

interface FeatureLabelWithProProps {
  label: string;
  isPro?: boolean;
  className?: string;
}

export function FeatureLabelWithPro({ label, isPro = false, className = "" }: FeatureLabelWithProProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {label}
      {isPro && <ProBadge variant="small" showTooltip={false} />}
    </span>
  );
}
