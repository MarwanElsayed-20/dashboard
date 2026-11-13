import localFont from "next/font/local";

/** Inter Tight, the portfolio's one typeface (variable 100 to 900). */
export const grotesk = localFont({
  src: [{ path: "../fonts/inter-tight-roman.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-grotesk",
  display: "swap",
});
