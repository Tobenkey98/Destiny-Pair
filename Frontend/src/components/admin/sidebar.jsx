import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { NAV, NAV_GROUPS } from "../../lib/nav";
import { useAdmin } from "../../context/AdminContext";
import { ChevronLeft, Cross, Shield } from "lucide-react";

function filterNavByRole(items, role) {
  return items.filter((item) => {
    if (!item.roles) return false;
    if (item.roles === "*") return true;
    return item.roles.includes(role);
  });
}

export function AdminSidebar({ collapsed, onToggle }) {
  const { adminProfile, roleDisplay } = useAdmin();
  const role = adminProfile?.role;

  if (!role) return null;

  return (
    <aside className={cn(
      "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
      collapsed ? "w-16" : "w-64",
    )}>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald to-gold flex items-center justify-center">
              <Cross className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-lg font-bold truncate block">Admin</span>
              <span className="text-[10px] text-sidebar-foreground/40 truncate block">{roleDisplay}</span>
            </div>
          </div>
        )}
        <button onClick={onToggle} className="shrink-0 h-8 w-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center transition">
          <ChevronLeft className={cn("h-4 w-4 transition", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-4">
        {NAV_GROUPS.map((group) => {
          const items = filterNavByRole(NAV.filter((n) => n.group === group), role);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              {!collapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-1">{group}</p>}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="shrink-0 h-5 min-w-5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-2 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-1 py-1">
            <Shield className="h-3 w-3 text-sidebar-foreground/40" />
            <span className="text-[10px] text-sidebar-foreground/40">{roleDisplay}</span>
          </div>
        </div>
      )}

    </aside>
  );
}

export function MobileNav({ pathname, onNavigate }) {
  const { adminProfile } = useAdmin();
  const role = adminProfile?.role;
  if (!role) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald to-gold flex items-center justify-center">
          <Cross className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="font-display text-lg font-bold">Admin</span>
          <p className="text-[10px] text-muted-foreground">{adminProfile?.role_display}</p>
        </div>
      </div>
      {NAV_GROUPS.map((group) => {
        const items = filterNavByRole(NAV.filter((n) => n.group === group), role);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{group}</p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.to}
                  onClick={() => { onNavigate(); window.location.href = item.to; }}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition",
                    pathname === item.to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span className="shrink-0 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
