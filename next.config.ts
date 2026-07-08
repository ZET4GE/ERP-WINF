import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Por defecto Next corta el body de una Server Action en 1 MB, y un
      // logo PNG normal (con transparencia, buena resolución) lo supera
      // fácilmente — eso es lo que causaba el error al subirlo.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
