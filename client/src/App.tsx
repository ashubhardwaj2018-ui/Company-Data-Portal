import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompareBar } from "@/components/companies/CompareBar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CompanyDetails from "@/pages/CompanyDetails";
import CountryPage from "@/pages/CountryPage";
import StatePage from "@/pages/StatePage";
import CityPage from "@/pages/CityPage";
import WatchlistPage from "@/pages/WatchlistPage";
import ComparePage from "@/pages/ComparePage";
import IndustryPage from "@/pages/IndustryPage";
import PincodePage from "@/pages/PincodePage";
import ProfilePage from "@/pages/ProfilePage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLogin from "@/pages/admin/AdminLogin";
import BlogList from "@/pages/BlogList";
import BlogPost from "@/pages/BlogPost";
import FAQ from "@/pages/FAQ";
import ImportData from "@/pages/ImportData";
import ArticleList from "@/pages/ArticleList";
import ArticleDetail from "@/pages/ArticleDetail";
import CompanyReportPage from "@/pages/CompanyReportPage";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsOfService from "@/pages/legal/TermsOfService";
import Disclaimer from "@/pages/legal/Disclaimer";
import ContactUs from "@/pages/legal/ContactUs";
import AboutAddressBay from "@/pages/legal/AboutAddressBay";
import LlpDirectory from "@/pages/LlpDirectory";
import LlpDetails from "@/pages/LlpDetails";
import IfscFinder from "@/pages/IfscFinder";
import IfscDetails from "@/pages/IfscDetails";

/** Scrolls the window to the top whenever the route changes (e.g. footer links). */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Legacy numeric-ID route — preserved for backward compat */}
      <Route path="/company/:id/report" component={CompanyReportPage} />
      <Route path="/company/:id" component={CompanyDetails} />
      {/* Country-aware slug routes: /in/company/reliance-industries-limited */}
      <Route path="/:countryCode/company/:slug/report" component={CompanyReportPage} />
      <Route path="/:countryCode/company/:slug" component={CompanyDetails} />
      {/* Geographic directory pages — city must be before state */}
      <Route path="/countries/:countryCode/:state/:city" component={CityPage} />
      <Route path="/countries/:countryCode/:state" component={StatePage} />
      <Route path="/countries/:countryCode" component={CountryPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/industry/:slug" component={IndustryPage} />
      <Route path="/pincode/:code" component={PincodePage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/import" component={ImportData} />
      <Route path="/blog" component={BlogList} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/articles" component={ArticleList} />
      <Route path="/articles/:slug" component={ArticleDetail} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/about" component={AboutAddressBay} />
      <Route path="/llps" component={LlpDirectory} />
      <Route path="/llps/:id" component={LlpDetails} />
      <Route path="/ifsc" component={IfscFinder} />
      <Route path="/ifsc/:code" component={IfscDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <Router />
        <CompareBar />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
