import LegalDocumentLayout from "../../components/legal/LegalDocumentLayout";
import { termsOfUse } from "../../legalContent/termsOfUse";
import { useSEO } from "../../hooks/useSEO";

export default function TermsOfUse() {
  useSEO({
    title: "DestinyPair Terms of Use",
    description:
      "The agreement that governs your use of DestinyPair — eligibility, responsibilities, subscriptions, prohibited behaviour and more.",
    canonical: `${window.location.origin}/terms-of-use`,
  });
  return <LegalDocumentLayout {...termsOfUse} eyebrow="Legal" />;
}
