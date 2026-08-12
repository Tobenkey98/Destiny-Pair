import LegalDocumentLayout from "../../components/legal/LegalDocumentLayout";
import { refundPolicy } from "../../legalContent/refundPolicy";
import { useSEO } from "../../hooks/useSEO";

export default function RefundPolicy() {
  useSEO({
    title: "DestinyPair Refund & Cancellation Policy",
    description:
      "How to cancel a DestinyPair subscription and when you may be eligible for a refund of your payment.",
    canonical: `${window.location.origin}/refund-policy`,
  });
  return <LegalDocumentLayout {...refundPolicy} eyebrow="Legal" />;
}
