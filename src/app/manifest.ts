import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Marwan's Dashboard",
    short_name: "Dashboard",
    description: "Portfolio messages and more.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ecf1ed",
    theme_color: "#ecf1ed",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
