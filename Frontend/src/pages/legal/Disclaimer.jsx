import LegalDocumentLayout from "../../components/legal/LegalDocumentLayout";
import { disclaimer } from "../../legalContent/disclaimer";
import { useSEO } from "../../hooks/useSEO";

export default function Disclaimer() {
  useSEO({
    title: "DestinyPair Disclaimer — What We Do and Don't Guarantee",
    description:
      "DestinyPair facilitates introductions — it does not guarantee marriage or compatibility. Read the full disclaimer.",
    canonical: `${window.location.origin}/disclaimer`,
  });
  return (
    <LegalDocumentLayout
      {...disclaimer}
      eyebrow="Legal"
      notice="Never send money, gifts or financial details to anyone you meet on DestinyPair. If anyone — member or otherwise — asks you for money, it is a scam. Report it to us immediately."
    />
  );
}
