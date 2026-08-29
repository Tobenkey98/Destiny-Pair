import React from "react";

// Clean, brand-coloured badge icon for the Flutterwave payment gateway.
// (Official brand SVG can be dropped in later if desired — this is a
// recognisable, self-contained fallback.)

export function FlutterwaveIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Flutterwave">
      <rect width="32" height="32" rx="8" fill="#009CFF" />
      <path
        d="M5 12c3-4 5 4 8 0s5-4 8 0"
        fill="none"
        stroke="#FF9A00"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M5 20c3-4 5 4 8 0s5-4 8 0"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
