import { ImageResponse } from "next/og";
import { Mark } from "@/lib/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The Home Screen icon on iPhone. iOS rounds the corners itself, so the square is full bleed. */
export default function AppleIcon() {
  return new ImageResponse(<Mark size={180} inset={18} rounded={false} />, size);
}
