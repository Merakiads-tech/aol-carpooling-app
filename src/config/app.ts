/**
 * Single source of truth for brand + support config.
 *
 * The app name is intentionally a variable so it can be changed later
 * without touching UI code — override with NEXT_PUBLIC_APP_NAME.
 */
export const APP_CONFIG = {
  /** Brand name shown everywhere in the UI. */
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "OneRide",
  /** Short tagline for hero / login. */
  tagline: "Share the drive. Arrive together.",
  /** One-line description used for metadata. */
  description:
    "Post a ride, request a seat, connect by phone. Community carpooling made simple.",
  /** Ride Admins contact — surfaced on the Home screen. */
  support: {
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
    whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;

/**
 * User-facing copy for the two core actions — kept here so wording can be
 * tuned without hunting through components.
 */
export const COPY = {
  findRide: "Find a Car",
  findRideSub: "Grab a seat on your route",
  offerRide: "Offer a Seat",
  offerRideSub: "Share your car, split the drive",
  navFind: "Find",
  navOffer: "Offer",
} as const;
