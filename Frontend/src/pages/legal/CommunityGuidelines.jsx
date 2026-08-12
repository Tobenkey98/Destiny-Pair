import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import LegalDocumentLayout from "../../components/legal/LegalDocumentLayout";
import { communityGuidelines } from "../../legalContent/communityGuidelines";
import { useSEO } from "../../hooks/useSEO";

export default function CommunityGuidelines() {
  useSEO({
    title: "DestinyPair Community & Safety Guidelines",
    description:
      "The standards that keep DestinyPair respectful, honest and safe — plus how to report and block members and stay safe.",
    canonical: `${window.location.origin}/community-guidelines`,
  });
  return (
    <>
      <LegalDocumentLayout
        {...communityGuidelines}
        eyebrow="Safety"
      />
      <section className="pb-24 -mt-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-8 rounded-3xl bg-luxury text-[color:var(--cream-soft)] shadow-luxe">
            <div className="h-14 w-14 rounded-2xl bg-gold flex items-center justify-center shrink-0">
              <ShieldAlert className="h-7 w-7 text-[color:var(--emerald-deep)]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-display text-xl font-bold text-gradient-gold">Experienced something that isn&rsquo;t right?</h2>
              <p className="mt-1 text-sm text-[color:var(--cream-soft)]/80">
                If a member has violated these guidelines or made you uncomfortable, report them. Our safety team reviews every report confidentially.
              </p>
            </div>
            <Link
              to="/contact"
              className="shrink-0 px-7 py-3.5 rounded-full bg-gold text-[color:var(--emerald-deep)] font-bold shadow-glow hover:scale-105 transition"
            >
              Report a User
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
