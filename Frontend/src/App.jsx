import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FourSquare } from "react-loading-indicators";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import AdminLayout from "./pages/admin/AdminLayout";

// Public pages
const Home = lazyWithRetry(() => import("./pages/Home"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const FaithValues = lazyWithRetry(() => import("./pages/FaithValues"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const HowItWorks = lazyWithRetry(() => import("./pages/HowItWorks"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Membership = lazyWithRetry(() => import("./pages/Membership"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("./pages/legal/TermsOfUse"));
const Disclaimer = lazyWithRetry(() => import("./pages/legal/Disclaimer"));
const RefundPolicy = lazyWithRetry(() => import("./pages/legal/RefundPolicy"));
const CommunityGuidelines = lazyWithRetry(() => import("./pages/legal/CommunityGuidelines"));
const Publications = lazyWithRetry(() => import("./pages/Publications"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const SocialComplete = lazyWithRetry(() => import("./pages/SocialComplete"));
const VerifyEmail = lazyWithRetry(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const DiscoverPage = lazyWithRetry(() => import("./pages/DiscoverPage"));

// Dashboard pages
const Overview = lazyWithRetry(() => import("./pages/dashboard/Overview"));
const ProfileCenter = lazyWithRetry(() => import("./pages/dashboard/ProfileCenter"));
const ProfileView = lazyWithRetry(() => import("./pages/dashboard/ProfileView"));
const DashboardDiscover = lazyWithRetry(() => import("./pages/dashboard/Discover"));
const Matches = lazyWithRetry(() => import("./pages/dashboard/Matches"));
const Chat = lazyWithRetry(() => import("./pages/dashboard/Chat"));
const Counselling = lazyWithRetry(() => import("./pages/dashboard/Counselling"));
const Notifications = lazyWithRetry(() => import("./pages/dashboard/Notifications"));

// Admin pages
const AdminLogin = lazyWithRetry(() => import("./pages/admin/AdminLogin"));
const AdminSignup = lazyWithRetry(() => import("./pages/admin/AdminSignup"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/Users"));
const AdminMatches = lazyWithRetry(() => import("./pages/admin/Matches"));
const AdminMessages = lazyWithRetry(() => import("./pages/admin/Messages"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/admin/Analytics"));
const AdminReports = lazyWithRetry(() => import("./pages/admin/Reports"));
const AdminModeration = lazyWithRetry(() => import("./pages/admin/Moderation"));
const AdminSupport = lazyWithRetry(() => import("./pages/admin/Support"));
const AdminContent = lazyWithRetry(() => import("./pages/admin/Content"));
const AdminPayments = lazyWithRetry(() => import("./pages/admin/Payments"));
const AdminEmails = lazyWithRetry(() => import("./pages/admin/Emails"));
const AdminSEO = lazyWithRetry(() => import("./pages/admin/SEO"));
const AdminLogs = lazyWithRetry(() => import("./pages/admin/Logs"));
const AdminIntegrations = lazyWithRetry(() => import("./pages/admin/Integrations"));
const AdminCounselling = lazyWithRetry(() => import("./pages/admin/Counselling"));
const AdminSubscriptions = lazyWithRetry(() => import("./pages/admin/Subscriptions"));
const AdminNotifications = lazyWithRetry(() => import("./pages/admin/Notifications"));
const AdminAdmins = lazyWithRetry(() => import("./pages/admin/Admins"));
const AdminAudit = lazyWithRetry(() => import("./pages/admin/Audit"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/Settings"));
const AdminDenominations = lazyWithRetry(() => import("./pages/admin/Denominations"));
const AdminPendingDenominations = lazyWithRetry(() => import("./pages/admin/PendingDenominations"));
const AdminChatbot = lazyWithRetry(() => import("./pages/admin/Chatbot"));
const AdminTestimonials = lazyWithRetry(() => import("./pages/admin/Testimonials"));

function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((err) => {
      console.warn("Route chunk failed to load, retrying...", err);
      return new Promise((resolve) => setTimeout(resolve, 600)).then(factory);
    })
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
    </div>
  );
}

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
    return <PageLoader />;
  }

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="min-h-screen">
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/checkout/:slug" element={<Checkout />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-use" element={<TermsOfUse />} />
            <Route path="/terms" element={<Navigate to="/terms-of-use" replace />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/publications" element={<Publications />} />
            <Route path="/register" element={<Register />} />
            <Route path="/social-complete" element={<SocialComplete />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="profile" element={<ProfileCenter />} />
                  <Route path="profile/:publicId" element={<ProfileView />} />
                  <Route path="discover" element={<DashboardDiscover />} />
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
                  <Route path="testimonials" element={<AdminTestimonials />} />
                  <Route path="bot-reports" element={<AdminChatbot />} />
                </Route>
<Route path="/*" element={<MainLayout />} />
              </Routes>
            </Suspense>
            <ChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
