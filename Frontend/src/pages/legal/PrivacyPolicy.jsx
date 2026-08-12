import LegalDocumentLayout from "../../components/legal/LegalDocumentLayout";
import { privacyPolicy } from "../../legalContent/privacyPolicy";
import { useSEO } from "../../hooks/useSEO";

export default function PrivacyPolicy() {
  useSEO({
    title: "DestinyPair Privacy Policy — How We Protect Your Information",
    description:
      "Read how DestinyPair collects, uses, stores and protects your personal information as a faith-guided marriage matchmaking platform.",
    canonical: `${window.location.origin}/privacy-policy`,
  });
  return <LegalDocumentLayout {...privacyPolicy} />;
}
