import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Resend } from "resend";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  message: z.string().min(1, "Message is required"),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const contactRoute = new Hono().post(
  "/",
  zValidator("json", contactSchema),
  async (c) => {
    const { name, email, message } = c.req.valid("json");

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return c.json({ error: "Email service not configured" }, 500);
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: "Checkpointer Contact <noreply@info.checkpointer.io>",
        to: "hello@checkpointer.io",
        replyTo: email,
        subject: `Contact Form: Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <h3>Message:</h3>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      });

      return c.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Failed to send email:", error);
      return c.json({ error: "Failed to send message" }, 500);
    }
  }
);
