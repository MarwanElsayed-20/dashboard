import { ImageResponse } from "next/og";
import { Mark } from "@/lib/mark";

const SIZES: Record<string, { size: number; inset: number; rounded: boolean }> = {
  "192": { size: 192, inset: 0, rounded: true },
  "512": { size: 512, inset: 0, rounded: true },
  // Maskable: full-bleed square, mark kept inside the central safe zone.
  "512-maskable": { size: 512, inset: 96, rounded: false },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

/** The install icons named in the manifest, drawn from the ME mark at build time. */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const spec = SIZES[(await params).size];
  if (!spec) return new Response("Not found", { status: 404 });
  return new ImageResponse(<Mark size={spec.size} inset={spec.inset} rounded={spec.rounded} />, {
    width: spec.size,
    height: spec.size,
  });
}
