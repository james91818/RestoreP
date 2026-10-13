import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { BalanceProvider } from "@/hooks/useBalance";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import AbuseGate from "./components/AbuseGate";
import Blocked from "./pages/Blocked";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AccountTypes from "./pages/AccountTypes";
import Cards from "./pages/Cards";
import Investments from "./pages/Investments";
import InvestCrypto from "./pages/investments/InvestCrypto";
import CryptoCategoryPage from "./pages/investments/CryptoCategoryPage";
import Impressum from "./pages/Impressum";
import CryptoPension from "./pages/CryptoPension";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";

import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import DownloadRustDesk from "./pages/DownloadRustDesk";


import TermsConditions from "./pages/legal/TermsConditions";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import SupportCenter from "./pages/SupportCenter";
import TradingHours from "./pages/TradingHours";
import InstrumentsPage from "./pages/Instruments";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";
import Unsubscribe from "./pages/Unsubscribe";
import EmailReply from "./pages/EmailReply";
import AutoLogin from "./pages/AutoLogin";
import {
  isBackofficeHost,
  isClientPublicHost,
  isLegacyBackofficeHost,
  getLegacyBackofficeRedirectUrl,
} from "@/lib/hosts";

// Admin pages
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminTrades from "./pages/admin/AdminTrades";
import AdminAssets from "./pages/admin/AdminAssets";

import AdminRoles from "./pages/admin/AdminRoles";
import AdminVoipSettings from "./pages/admin/AdminVoipSettings";
import AdminCopyTrading from "./pages/admin/AdminCopyTrading";
import AdminDepositors from "./pages/admin/AdminDepositors";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminStaking from "./pages/admin/AdminStaking";

import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminFollowUps from "./pages/admin/AdminFollowUps";
import AdminScoreboard from "./pages/admin/AdminScoreboard";
import AdminLiveChats from "./pages/admin/AdminLiveChats";
import AdminWelcomeStats from "./pages/admin/AdminWelcomeStats";
import AdminConversionStats from "./pages/admin/AdminConversionStats";
import AdminRetentionStats from "./pages/admin/AdminRetentionStats";
import AdminPendingRequests from "./pages/admin/AdminPendingRequests";
import AdminPendingRetention from "./pages/admin/AdminPendingRetention";
import AdminAttachedWallets from "./pages/admin/AdminAttachedWallets";
import AdminEmailReplies from "./pages/admin/AdminEmailReplies";
import AdminTierLimits from "./pages/admin/AdminTierLimits";
import AdminWelcomeBanks from "./pages/admin/AdminWelcomeBanks";
import AdminAffiliatesBalances from "./pages/admin/AdminAffiliatesBalances";

// Client pages
import Trading from "./pages/client/Trading";
import WalletPage from "./pages/client/Wallet";
import Staking from "./pages/client/Staking";
import Watchlist from "./pages/client/Watchlist";
import CopyTrading from "./pages/client/CopyTrading";
import PnlSummary from "./pages/client/PnlSummary";
import ClientCalendar from "./pages/client/Calendar";

// Shared pages
import Notifications from "./pages/shared/Notifications";
import Support from "./pages/shared/Support";
import Settings from "./pages/shared/Settings";

const queryClient = new QueryClient();

// On the public client domains (crypto-borse.com, vip-crypto-boerse.com),
// no /backoffice/* route should be reachable — clients must never see admin UI.
const BackofficeHostGuard = () =>
  isClientPublicHost() ? <Navigate to="/" replace /> : <Outlet />;

// On the backoffice domain (backoffice.crypto-borse.com), public marketing/client
// pages must not be reachable — only the backoffice login and admin routes.
const PublicHostGuard = () =>
  isBackofficeHost() ? <Navigate to="/" replace /> : <Outlet />;

const App = () => {
  // Redirect legacy backoffice hostnames to the canonical backoffice subdomain.
  if (typeof window !== "undefined" && isLegacyBackofficeHost()) {
    window.location.replace(getLegacyBackofficeRedirectUrl());
    return null;
  }
  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
        <BalanceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AbuseGate />
            <Routes>
              <Route path="/blocked" element={<Blocked />} />

              <Route path="/" element={
                isBackofficeHost() ? <AdminLogin /> : <Landing />
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/al/:token" element={<AutoLogin />} />
              {/* Backoffice login is available on every host — deeper /backoffice/* routes
                  remain guarded by role + host so clients still cannot reach admin UI. */}
              {/* Backoffice login is only reachable on the dedicated backoffice
                  subdomain (or previews/localhost). On the public client
                  domain, /backoffice is redirected to the landing page. */}
              <Route
                path="/backoffice"
                element={isClientPublicHost() ? <Navigate to="/" replace /> : <AdminLogin />}
              />

              <Route element={<PublicHostGuard />}>
                <Route path="/signup" element={<Signup />} />
                <Route path="/account-types" element={<AccountTypes />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/investments" element={<Investments />} />
                <Route path="/investments/krypto" element={<InvestCrypto />} />
                <Route path="/investments/:slug" element={<CryptoCategoryPage />} />
                <Route path="/impressum" element={<Impressum />} />
                <Route path="/krypto-vorsorge" element={<CryptoPension />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/welcome" element={<ThankYou />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/download-rustdesk" element={<DownloadRustDesk />} />


                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/support-center" element={<SupportCenter />} />
                <Route path="/trading-hours" element={<TradingHours />} />
                <Route path="/handelsplatz" element={<InstrumentsPage />} />
                <Route path="/thank-you" element={<Navigate to="/welcome" replace />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="/reply/:token" element={<EmailReply />} />
              </Route>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Client routes */}
                <Route path="/trading" element={<Trading />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/staking" element={<Staking />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/copy-trading" element={<CopyTrading />} />
                <Route path="/pnl" element={<PnlSummary />} />
                <Route path="/calendar" element={<ClientCalendar />} />
                {/* Admin routes - protected by role + host */}
                <Route element={<BackofficeHostGuard />}>
                  <Route element={<ProtectedRoute requireStaff />}>
                    <Route path="/backoffice/users" element={<AdminUsers />} />
                    <Route path="/backoffice/users/:userId" element={<AdminUserDetail />} />
                    <Route path="/backoffice/depositors" element={<AdminDepositors />} />
                    <Route path="/backoffice/pending-requests" element={<AdminPendingRequests />} />
                    <Route path="/backoffice/pending-retention" element={<AdminPendingRetention />} />
                    <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                      <Route path="/backoffice/attached-wallets" element={<AdminAttachedWallets />} />
                    </Route>
                    <Route path="/backoffice/trades" element={<AdminTrades />} />
                    <Route path="/backoffice/staking" element={<AdminStaking />} />
                    <Route path="/backoffice/copy-trading" element={<AdminCopyTrading />} />
                    <Route path="/backoffice/assets" element={<AdminAssets />} />
                    <Route path="/backoffice/calendar" element={<AdminCalendar />} />
                    <Route path="/backoffice/tasks" element={<AdminTasks />} />
                    <Route path="/backoffice/follow-ups" element={<AdminFollowUps />} />
                    <Route path="/backoffice/scoreboard" element={<AdminScoreboard />} />
                    <Route path="/backoffice/live-chats" element={<AdminLiveChats />} />
                    <Route path="/backoffice/welcome-stats" element={<AdminWelcomeStats />} />
                    <Route path="/backoffice/welcome-banks" element={<AdminWelcomeBanks />} />
                    <Route path="/backoffice/conversion-stats" element={<AdminConversionStats />} />
                    <Route path="/backoffice/retention-stats" element={<AdminRetentionStats />} />
                    <Route path="/backoffice/email-replies" element={<AdminEmailReplies />} />
                  </Route>
                  {/* Admin-only routes */}
                  <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                    <Route path="/backoffice/agents" element={<AdminAgents />} />
                    <Route path="/backoffice/affiliates" element={<AdminAffiliates />} />
                    <Route path="/backoffice/affiliates-balances" element={<AdminAffiliatesBalances />} />
                    <Route path="/backoffice/roles" element={<AdminRoles />} />
                    <Route path="/backoffice/tier-limits" element={<AdminTierLimits />} />
                    <Route path="/backoffice/voip" element={<AdminVoipSettings />} />
                  </Route>
                </Route>

                {/* Shared routes */}
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/support" element={<Support />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </BalanceProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};


export default App;
