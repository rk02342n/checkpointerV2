import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Resend } from "resend";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  message: z.string().min(1, "Message is required"),
});

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
        from: "Checkpointer Contact <onboarding@resend.dev>", // needs to be changed to checkpointer domain on resend
        to: "hello@checkpointer.io",
        replyTo: email,
        subject: `Contact Form: Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });

      return c.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Failed to send email:", error);
      return c.json({ error: "Failed to send message" }, 500);
    }
  }
);
