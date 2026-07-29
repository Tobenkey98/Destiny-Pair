import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Shield, Bell, Palette, Globe, CreditCard } from "lucide-react";
import { PageHeader } from "../../components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";

const sections = [
  { key: "general", icon: Palette, label: "General" },
  { key: "notifications", icon: Bell, label: "Notifications" },
  { key: "security", icon: Shield, label: "Security" },
  { key: "payments", icon: CreditCard, label: "Payments" },
  { key: "localization", icon: Globe, label: "Localization" },
];

export default function AdminSettings() {
  const [active, setActive] = useState("general");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage platform configuration" />

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit mb-6 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${active === s.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <s.icon className="h-4 w-4" /> {s.label}
          </button>
        ))}
      </div>

      <motion.div key={active} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {active === "general" && (
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic platform information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Platform Name", value: "Destiny Pair" },
                { label: "Tagline", value: "Find Your God's Best" },
                { label: "Support Email", value: "support@destinypair.com" },
                { label: "Max Daily Likes", value: "10" },
              ].map((f, i) => (
                <div key={i} className="grid sm:grid-cols-3 gap-2 items-center">
                  <label className="text-sm font-medium">{f.label}</label>
                  <Input className="sm:col-span-2" defaultValue={f.value} />
                </div>
              ))}
              <div className="flex justify-end pt-4">
                <Button><Save className="h-4 w-4" /> Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {active === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email and push notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Notification settings coming soon.</p>
            </CardContent>
          </Card>
        )}

        {active === "security" && (
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage security policies and access control</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Security settings coming soon.</p>
            </CardContent>
          </Card>
        )}

        {active === "payments" && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure subscription plans and payment gateways</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Payment settings coming soon.</p>
            </CardContent>
          </Card>
        )}

        {active === "localization" && (
          <Card>
            <CardHeader>
              <CardTitle>Localization</CardTitle>
              <CardDescription>Language, timezone, and regional settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Localization settings coming soon.</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
