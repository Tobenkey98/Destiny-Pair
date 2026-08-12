import { motion } from "framer-motion";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "../ui/accordion";

/** One FAQ question/answer in an accessible accordion item. */
export default function FAQItem({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.2) }}
    >
      <AccordionItem
        value={`${item.q}`}
        className="rounded-2xl bg-background border border-border/60 px-6 shadow-soft data-[state=open]:border-[color:var(--gold-royal)]/30 data-[state=open]:shadow-luxe"
      >
        <AccordionTrigger className="font-display text-[15px] sm:text-base font-semibold text-left [&[data-state=open]]:text-[color:var(--emerald-deep)] dark:[&[data-state=open]]:text-[color:var(--gold-royal)]">
          {item.q}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-relaxed">
          {item.a}
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
}
