import "server-only";
import { Resend } from "resend";
import { APP_CONFIG } from "@/config/app";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM ?? "OneRide <onboarding@resend.dev>";
const resend = KEY ? new Resend(KEY) : null;

/** Sends an email via Resend. No-op (logs) when RESEND_API_KEY is unset. */
export async function sendMail(opts: {
  to: string | null | undefined;
  subject: string;
  html: string;
}) {
  if (!opts.to) return;
  if (!resend) {
    console.info("[mail] skipped (no RESEND_API_KEY):", opts.subject);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (e) {
    console.error("[mail] send failed:", e);
  }
}

/** Minimal branded email shell. */
export function emailLayout(heading: string, body: string, cta?: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1b19;background:#faf7f1">
    <p style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b4690e;margin:0 0 12px">${APP_CONFIG.name}</p>
    <h1 style="font-size:22px;margin:0 0 12px;font-family:Georgia,serif">${heading}</h1>
    <div style="font-size:15px;line-height:1.6;color:#3a352d">${body}</div>
    ${cta ? `<div style="margin-top:20px">${cta}</div>` : ""}
    <p style="font-size:12px;color:#6c665c;margin-top:28px">Coordinate the rest by phone — ${APP_CONFIG.name} never charges for rides.</p>
  </div>`;
}
