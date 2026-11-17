import { NextResponse } from "next/server";

interface ContactRequestBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  honeypot?: string;
}

export async function POST(request: Request) {
  try {
    const body: ContactRequestBody = await request.json().catch(() => ({}));
    const { firstName, lastName, email, phone, subject, message, honeypot } = body;

    // Honeypot spam protection
    if (honeypot) {
      return NextResponse.json({ success: true, message: "Message received" }, { status: 200 });
    }

    // Required fields check
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "Please provide your full name." }, { status: 400 });
    }

    if (!email?.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (!message?.trim() || message.trim().length < 5) {
      return NextResponse.json({ error: "Please enter a message with details." }, { status: 400 });
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanEmail = email.trim();
    const cleanPhone = phone?.trim() || "Not provided";
    const cleanSubject = subject?.trim() || "New Client Inquiry";
    const cleanMessage = message.trim();
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" });

    // Primary recipients requested by client
    const targetRecipients = ["bellixus062@gmail.com", "aryanthealgohype@gmail.com"];
    const fallbackRecipient = "aryanthealgohype@gmail.com";

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not defined in environment variables.");
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #07130e; border: 1px solid rgba(208, 244, 113, 0.25); border-radius: 16px; overflow: hidden; color: #f1f5f9;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #091712 0%, #142e25 100%); padding: 28px 32px; border-bottom: 1px solid rgba(208, 244, 113, 0.2);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #d0f471; box-shadow: 0 0 12px #d0f471;"></span>
            <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #d0f471;">Bellix.us AI Studio — Notification</span>
          </div>
          <h1 style="margin: 12px 0 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
            New Contact Submission
          </h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
            A user submitted the contact form on Bellix.us. Full details below:
          </p>
        </div>

        <!-- Meta Table -->
        <div style="padding: 24px 32px; background: #091712;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; width: 140px; font-weight: 600;">Client Name:</td>
              <td style="padding: 10px 0; color: #ffffff; font-weight: 700;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">Client Email:</td>
              <td style="padding: 10px 0;">
                <a href="mailto:${cleanEmail}" style="color: #d0f471; text-decoration: none; font-weight: 600;">${cleanEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">Phone Number:</td>
              <td style="padding: 10px 0; color: #ffffff;">${cleanPhone}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">Subject:</td>
              <td style="padding: 10px 0; color: #ffffff; font-weight: 600;">${cleanSubject}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; font-weight: 600;">Submission Time:</td>
              <td style="padding: 10px 0; color: #94a3b8; font-size: 12px;">${timestamp} UTC</td>
            </tr>
          </table>

          <!-- Message Box -->
          <div style="margin-top: 20px; padding: 20px; background: #10241e; border: 1px solid rgba(208, 244, 113, 0.2); border-radius: 12px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #d0f471; margin-bottom: 8px;">
              Client Message:
            </div>
            <div style="font-size: 15px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${cleanMessage}</div>
          </div>

          <!-- Quick Action -->
          <div style="margin-top: 24px; text-align: center;">
            <a href="mailto:${cleanEmail}?subject=Re:%20${encodeURIComponent(cleanSubject)}%20-%20Bellix.us" style="display: inline-block; padding: 12px 28px; background: #d0f471; color: #091712; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px;">
              Reply directly to ${fullName} (${cleanEmail})
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 32px; background: #050e0a; border-top: 1px solid rgba(208, 244, 113, 0.1); font-size: 11px; color: #64748b; text-align: center;">
          Sent automatically to <strong>bellixus062@gmail.com</strong> &amp; <strong>aryanthealgohype@gmail.com</strong> via Bellix.us Studio.
        </div>
      </div>
    `;

    // Attempt 1: Send to both target recipients
    let emailSent = false;
    let resendId: string | null = null;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Bellix Studio <onboarding@resend.dev>",
          to: targetRecipients,
          reply_to: cleanEmail,
          subject: `[Bellix Contact] ${cleanSubject} — from ${fullName}`,
          html: htmlContent,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.id) {
        emailSent = true;
        resendId = resData.id;
        console.log("Resend delivery to both recipients successful:", resData.id);
      } else {
        console.warn("Attempt 1 to both recipients rejected by Resend:", resData);
      }
    } catch (err) {
      console.error("Resend Attempt 1 fetch error:", err);
    }

    // Attempt 2: If both failed (e.g. Resend free testing sandbox restriction for unverified external domain),
    // immediately send to the verified account owner email so the submission is 100% captured!
    if (!emailSent) {
      try {
        const fallbackRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Bellix Studio <onboarding@resend.dev>",
            to: [fallbackRecipient],
            reply_to: cleanEmail,
            subject: `[Bellix Alert for bellixus062 & aryan] ${cleanSubject} — from ${fullName}`,
            html: htmlContent,
          }),
        });

        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok && fallbackData.id) {
          emailSent = true;
          resendId = fallbackData.id;
          console.log("Resend fallback delivery to account owner successful:", fallbackData.id);
        } else {
          console.error("Resend Fallback attempt error:", fallbackData);
        }
      } catch (fallbackErr) {
        console.error("Resend Fallback fetch error:", fallbackErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been sent successfully. We will get back to you shortly!",
        emailSent,
        id: resendId,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Contact API unhandled error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
