import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, ArrowLeft, Rocket } from "lucide-react";
import { Link } from "wouter";
import { TIER_CONFIG, BETA_INFO } from "@shared/tier-config";
import { isBetaMode } from "@shared/tier-utils";

export default function Pricing() {
  const betaMode = isBetaMode();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to CSVVIZ
            </Button>
          </Link>
          {betaMode && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-beta-pricing">
              BETA
            </Badge>
          )}
        </div>
      </header>

      <main className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {betaMode && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8 flex items-start gap-3" data-testid="banner-beta-notice">
              <Rocket className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">CSVVIZ is currently in Beta</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All features are free during beta! Basic features will remain free forever. 
                  Pro features will require a subscription after beta ends.
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-3" data-testid="text-pricing-headline">
              Simple, Transparent Pricing
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free, upgrade when you need more power. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="relative" data-testid="card-tier-free">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {TIER_CONFIG.free.displayName}
                </CardTitle>
                <CardDescription>{TIER_CONFIG.free.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full mb-6" variant="outline" data-testid="button-get-started-free">
                  {TIER_CONFIG.free.cta}
                </Button>
                <ul className="space-y-3">
                  {BETA_INFO.freeForeverFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="relative border-primary/50 shadow-lg" data-testid="card-tier-pro">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Crown className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  {TIER_CONFIG.pro.displayName}
                </CardTitle>
                <CardDescription>{TIER_CONFIG.pro.description}</CardDescription>
                <div className="pt-4">
                  {betaMode ? (
                    <div>
                      <span className="text-4xl font-bold line-through text-muted-foreground">
                        ${TIER_CONFIG.pro.price?.monthly}
                      </span>
                      <span className="text-2xl font-bold text-primary ml-2">FREE</span>
                      <span className="text-muted-foreground ml-1">during beta</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">${TIER_CONFIG.pro.price?.monthly}</span>
                      <span className="text-muted-foreground ml-1">/month</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full mb-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" 
                  disabled={betaMode}
                  data-testid="button-upgrade-pro"
                >
                  {betaMode ? "Available After Beta" : TIER_CONFIG.pro.cta}
                </Button>
                <p className="text-xs text-muted-foreground mb-4">Everything in Free, plus:</p>
                <ul className="space-y-3">
                  {BETA_INFO.upcomingProFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <h2 className="text-xl font-semibold mb-4">Need Enterprise Features?</h2>
            <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
              {TIER_CONFIG.enterprise.description}. Get API access, unlimited files, and dedicated support.
            </p>
            <Button variant="outline" disabled data-testid="button-contact-sales">
              Coming Soon
            </Button>
          </div>

          <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>Questions? Reach out to us at support@csvviz.com</p>
          </div>
        </div>
      </main>
    </div>
  );
}
