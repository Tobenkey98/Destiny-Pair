import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Mosaic } from "react-loading-indicators";
import { AdminProvider, useAdmin } from "../../context/AdminContext";
import { getAdminAccessToken } from "../../lib/api";
import { AdminSidebar, MobileNav } from "../../components/admin/sidebar";
import { AdminTopbar } from "../../components/admin/topbar";
import { Sheet, SheetContent } from "../../components/ui/sheet";

const ROLE_RESTRICTED_ROUTES = {
  '/admin/users': ['super_admin', 'operations_admin', 'moderator'],
  '/admin/matches': ['super_admin', 'operations_admin'],
  '/admin/messages': ['super_admin', 'operations_admin', 'moderator'],
  '/admin/counselling': ['super_admin', 'counsellor'],
  '/admin/subscriptions': ['super_admin', 'operations_admin'],
  '/admin/payments': ['super_admin', 'operations_admin'],
  '/admin/reports': ['super_admin', 'operations_admin', 'moderator'],
  '/admin/moderation': ['super_admin', 'moderator'],
  '/admin/notifications': ['super_admin', 'operations_admin'],
  '/admin/analytics': ['super_admin'],
  '/admin/content': ['super_admin'],
  '/admin/support': ['super_admin', 'operations_admin'],
  '/admin/audit': ['super_admin'],
  '/admin/roles': ['super_admin'],
  '/admin/settings': ['super_admin'],
  '/admin/admins': ['super_admin'],
  '/admin/emails': ['super_admin'],
  '/admin/seo': ['super_admin'],
  '/admin/logs': ['super_admin'],
  '/admin/integrations': ['super_admin'],
  '/admin/denominations': ['super_admin', 'operations_admin'],
  '/admin/pending-denominations': ['super_admin', 'operations_admin'],
};

function getToken() {
  return getAdminAccessToken();
}

function AdminGuard({ children }) {
  const { adminProfile, loading } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (loading) return;
    if (!adminProfile) {
      navigate('/admin/login', { replace: true });
      return;
    }

    const allowedRoles = ROLE_RESTRICTED_ROUTES[location.pathname];
    if (allowedRoles && !allowedRoles.includes(adminProfile.role)) {
      navigate('/admin', { replace: true });
    }
  }, [adminProfile, loading, location.pathname, navigate]);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
          <Mosaic color="var(--admin-loader)" size="medium" text="" textColor="" />
        </div>
    );
  }

  if (!adminProfile) return null;

  return children;
}

function AdminLayoutInner() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { adminProfile } = useAdmin();

  return (
    <AdminGuard>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
            <MobileNav pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopbar onMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mx-auto w-full max-w-[1400px] px-4 lg:px-8 py-6 lg:py-8"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminLayoutInner />
    </AdminProvider>
  );
}
