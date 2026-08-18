import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep already-visited routes in the client Router Cache so switching
    // back to a tab (Home/Find/Offer/My Rides) restores instantly instead of
    // re-rendering on the server every time. Default dynamic is 0 (no reuse).
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
