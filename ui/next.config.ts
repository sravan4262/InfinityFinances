import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["unheard-finisher-promotion.ngrok-free.dev"],
  // turbopack.root only needed locally (monorepo root node_modules).
  // On Vercel, root dir is ui/ so the parent has no node_modules.
  ...(process.env.NODE_ENV !== "production" && {
    turbopack: {
      root: path.resolve(__dirname, ".."),
    },
  }),
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Google recommends this specifically for GIS testing on http://localhost.
            key: "Referrer-Policy",
            value:
              process.env.NODE_ENV === "production"
                ? "strict-origin-when-cross-origin"
                : "no-referrer-when-downgrade",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
