import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <ShieldAlert className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This admin page does not exist.</p>
      <Link to="/admin" className="mt-8 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
        Back to Dashboard
      </Link>
    </div>
  );
}
