import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos placeholder de la galería; al pasar a fotos reales en /public/cortes se puede quitar.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
