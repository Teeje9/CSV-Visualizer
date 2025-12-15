import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Pricing from "@/pages/pricing";
import Feedback from "@/pages/feedback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Home variantSlug="default" />} />
      <Route path="/csv-charts" component={() => <Home variantSlug="csv-charts" />} />
      <Route path="/excel-analysis" component={() => <Home variantSlug="excel-analysis" />} />
      <Route path="/sales-dashboard" component={() => <Home variantSlug="sales-dashboard" />} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/feedback" component={Feedback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
