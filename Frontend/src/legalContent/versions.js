// Current published versions of DestinyPair's legal documents.
// Keep in sync with Backend/accounts/legal.py::DOCUMENT_VERSIONS.
// Bump a version when the document's wording changes — the backend refuses
// checkout until TERMS_OF_USE + REFUND_POLICY have been accepted at the
// current version.

export const DOCUMENT_VERSIONS = {
  TERMS_OF_USE: "1.1",
  PRIVACY_POLICY: "1.1",
  REFUND_POLICY: "1.1",
};

export const versionLabel = (doc) => `v${DOCUMENT_VERSIONS[doc] || "1.0"}`;
