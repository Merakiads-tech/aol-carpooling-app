import "server-only";

/**
 * WhatsApp notifications via an OpenWA server.
 *
 * WHATSAPP_MODE picks the behaviour on any environment (local, preview or
 * production alike):
 *   off  — nothing is sent (default; also any unrecognised value)
 *   dev  — every message is redirected to WHATSAPP_DEV_NUMBER, tagged with who
 *          it was meant for, so real riders/drivers are never messaged
 *   live — messages go to the real rider/driver
 */
const RAW_MODE = process.env.WHATSAPP_MODE?.trim().toLowerCase();
const MODE: "off" | "dev" | "live" =
  RAW_MODE === "dev" || RAW_MODE === "live" ? RAW_MODE : "off";
const API_URL = (process.env.WHATSAPP_API_URL ?? "http://localhost:2785").replace(/\/$/, "");
const SESSION = process.env.WHATSAPP_SESSION_ID;
const API_KEY = process.env.WHATSAPP_API_KEY;
const DEV_NUMBER = process.env.WHATSAPP_DEV_NUMBER;
/** First line of every message, so recipients know who it's from. */
const HEADER = process.env.WHATSAPP_HEADER ?? "Harivan One Ride Notification";

/** "+91 98155-40544" / "098155 40544" / "9815540544" → "919815540544". */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`; // bare Indian mobile
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** Readable phone: "+91 9815540544" for Indian numbers, else "+<digits>". */
export function formatPhone(phone: string | null | undefined): string | null {
  const d = toWhatsAppNumber(phone);
  if (!d) return phone?.trim() || null;
  return d.length === 12 && d.startsWith("91") ? `+91 ${d.slice(2)}` : `+${d}`;
}

/** Sends a WhatsApp text. Never throws; no-op (logs) when disabled. */
export async function sendWhatsApp(opts: {
  to: string | null | undefined;
  text: string;
}) {
  if (MODE === "off") return;
  if (!SESSION || !API_KEY) {
    console.info("[whatsapp] skipped (WHATSAPP_SESSION_ID / WHATSAPP_API_KEY unset)");
    return;
  }

  const intended = toWhatsAppNumber(opts.to);
  let target = intended;
  let text = `🔔 *${HEADER}*\n\n${opts.text}`;
  if (MODE === "dev") {
    target = toWhatsAppNumber(DEV_NUMBER);
    if (!target) {
      console.info("[whatsapp] skipped (WHATSAPP_MODE=dev but WHATSAPP_DEV_NUMBER unset)");
      return;
    }
    const dev = `🧪 _DEV — meant for ${intended ? `+${intended}` : `"${opts.to ?? "no phone"}"`}_`;
    text = text.replace("\n\n", `\n${dev}\n\n`);
  } else if (!target) {
    if (opts.to) console.info("[whatsapp] skipped (unusable phone):", opts.to);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/sessions/${SESSION}/messages/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ chatId: `${target}@c.us`, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[whatsapp] send failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[whatsapp] send failed:", e);
  }
}
