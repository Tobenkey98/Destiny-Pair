import { Rocket, User, Heart, MessageCircle, Crown, Phone, BookHeart, Shield, CreditCard, HelpCircle, Lock } from "lucide-react";

const ICONS = {
  Rocket,
  User,
  Heart,
  MessageCircle,
  Crown,
  Phone,
  BookHeart,
  Shield,
  CreditCard,
  HelpCircle,
  Lock,
};

/** A category heading with icon, used to group FAQ items. */
export default function FAQCategory({ category, children }) {
  const Icon = ICONS[category.icon] || HelpCircle;
  return (
    <section aria-labelledby={`faq-${category.id}`} className="mb-12 scroll-mt-28">
      <h2
        id={`faq-${category.id}`}
        className="flex items-center gap-3 font-display text-2xl font-bold text-foreground mb-5"
      >
        <span className="h-10 w-10 rounded-2xl bg-emerald/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[color:var(--emerald-deep)] dark:text-[color:var(--gold-royal)]" />
        </span>
        {category.label}
      </h2>
      {children}
    </section>
  );
}
