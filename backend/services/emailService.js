// services/emailService.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "School Portal <noreply@lovohcreate.com>";

export const sendEmail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email");
  }
  return data;
};

export const sendOtpEmail = async (to, otp, name = "") => {
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="margin: 0 0 8px;">Hi${name ? " " + name : ""} 👋</h2>
      <p style="color: #555; margin: 0 0 24px;">Here is your one-time verification code for the School Portal:</p>
      <div style="font-size: 34px; letter-spacing: 10px; font-weight: 700; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 10px; color: #111;">
        ${otp}
      </div>
      <p style="margin: 24px 0 0; color: #555;">This code expires in <strong>10 minutes</strong>. Never share it with anyone.</p>
      <p style="color: #999; font-size: 13px; margin-top: 24px;">If you didn’t request this, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({
    to,
    subject: "Your verification code — School Portal",
    html,
  });
};