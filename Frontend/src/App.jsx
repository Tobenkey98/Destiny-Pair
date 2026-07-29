import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { FourSquare } from "react-loading-indicators";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FaithValues from "./pages/FaithValues";
import FAQ from "./pages/FAQ";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import Membership from "./pages/Membership";
import Privacy from "./pages/Privacy";
import Publications from "./pages/Publications";
import Register from "./pages/Register";
import SocialComplete from "./pages/SocialComplete";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import Overview from "./pages/dashboard/Overview";
import ProfileCenter from "./pages/dashboard/ProfileCenter";
import DiscoverPage from "./pages/DiscoverPage";
import Discover from "./pages/dashboard/Discover";
import ProfileView from "./pages/dashboard/ProfileView";
import Matches from "./pages/dashboard/Matches";
import Chat from "./pages/dashboard/Chat";
import Counselling from "./pages/dashboard/Counselling";
import Notifications from "./pages/dashboard/Notifications";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSignup from "./pages/admin/AdminSignup";
import { AdminProvider } from "./context/AdminContext";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminMatches from "./pages/admin/Matches";
import AdminMessages from "./pages/admin/Messages";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminReports from "./pages/admin/Reports";
import AdminModeration from "./pages/admin/Moderation";
import AdminSupport from "./pages/admin/Support";
import AdminContent from "./pages/admin/Content";
import AdminPayments from "./pages/admin/Payments";
import AdminEmails from "./pages/admin/Emails";
import AdminSEO from "./pages/admin/SEO";
import AdminLogs from "./pages/admin/Logs";
import AdminIntegrations from "./pages/admin/Integrations";
import AdminCounselling from "./pages/admin/Counselling";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminNotifications from "./pages/admin/Notifications";
import AdminAdmins from "./pages/admin/Admins";
import AdminAudit from "./pages/admin/Audit";
import AdminSettings from "./pages/admin/Settings";
import AdminDenominations from "./pages/admin/Denominations";
import AdminPendingDenominations from "./pages/admin/PendingDenominations";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function MainLayout() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      setLoading(true);
      prevPath.current = location.pathname;
    }
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </main>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/faith-values" element={<FaithValues />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/register" element={<Register />} />
          <Route path="/social-complete" element={<SocialComplete />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="profile" element={<ProfileCenter />} />
              <Route path="profile/:id" element={<ProfileView />} />
              <Route path="discover" element={<Discover />} />
              <Route path="matches" element={<Matches />} />
              <Route path="chat" element={<Chat />} />
              <Route path="chat/:id" element={<Chat />} />
              <Route path="counselling" element={<Counselling />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
            <Route path="/admin/login" element={<AdminProvider><AdminLogin /></AdminProvider>} />
            <Route path="/admin/signup" element={<AdminProvider><AdminSignup /></AdminProvider>} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="matches" element={<AdminMatches />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="moderation" element={<AdminModeration />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="emails" element={<AdminEmails />} />
              <Route path="seo" element={<AdminSEO />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="integrations" element={<AdminIntegrations />} />
              <Route path="admins" element={<AdminAdmins />} />
              <Route path="counselling" element={<AdminCounselling />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="denominations" element={<AdminDenominations />} />
              <Route path="pending-denominations" element={<AdminPendingDenominations />} />
            </Route>
            <Route path="/*" element={<MainLayout />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
