import { motion } from "framer-motion";
import { PageHeader } from "./page-header";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

export function SectionStub({ title, description, emptyIcon: EmptyIcon, emptyTitle, emptyBody }) {
  return (
    <div>
      <PageHeader title={title} description={description} actions={<Button size="sm"><Plus className="h-4 w-4" /> Add New</Button>} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
        {EmptyIcon && (
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <EmptyIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
        {emptyBody && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{emptyBody}</p>}
      </motion.div>
    </div>
  );
}
