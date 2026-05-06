'use server'

/**
 * Email service powered by Resend.
 *
 * Required environment variables:
 *   - RESEND_API_KEY     -> https://resend.com/api-keys
 *   - RESEND_FROM_EMAIL  -> a verified sender email (e.g. noreply@yourdomain.com)
 *                          For testing without a domain, use "onboarding@resend.dev".
 *   - RESEND_FROM_NAME   -> sender display name (defaults to "pharmasync-track")
 *   - APP_URL            -> public app URL used to build the reset link
 */

type SendEmailParams = {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
}

export async function sendEmail({
  to,
  toName,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams): Promise<{ success: boolean; error?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const senderEmail = process.env.RESEND_FROM_EMAIL
  const senderName = process.env.RESEND_FROM_NAME || 'pharmasync-track'

  if (!apiKey) {
    console.error('[pharmasync-track] RESEND_API_KEY is not set')
    return { success: false, error: 'Email service not configured' }
  }

  if (!senderEmail) {
    console.error('[pharmasync-track] RESEND_FROM_EMAIL is not set')
    return { success: false, error: 'Sender email not configured' }
  }

  // Resend "from" format: "Display Name <email@domain.com>"
  const from = `${senderName} <${senderEmail}>`
  const toField = toName ? `${toName} <${to}>` : to

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [toField],
        subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]+>/g, ''),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[pharmasync-track] Resend error:', res.status, body)

      // Try to parse Resend's structured error to surface a useful message
      let parsedMessage: string | undefined
      let parsedName: string | undefined
      try {
        const json = JSON.parse(body) as { message?: string; name?: string }
        parsedMessage = json.message
        parsedName = json.name
      } catch {
        // body wasn't JSON
      }

      // Map common Resend failure modes to actionable messages
      let friendly = `Email service error (${res.status})`
      if (res.status === 401 || res.status === 403) {
        friendly =
          'Invalid Resend API key. Check RESEND_API_KEY in your environment variables.'
      } else if (
        res.status === 422 ||
        parsedName === 'validation_error' ||
        parsedMessage?.toLowerCase().includes('domain') ||
        parsedMessage?.toLowerCase().includes('verify') ||
        parsedMessage?.toLowerCase().includes('from')
      ) {
        friendly =
          parsedMessage ||
          'Resend rejected the sender. Verify RESEND_FROM_EMAIL belongs to a verified domain (or use "onboarding@resend.dev" for testing).'
      } else if (parsedMessage) {
        friendly = `Email service error: ${parsedMessage}`
      }

      return { success: false, error: friendly }
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[pharmasync-track] Resend request failed:', err)
    return { success: false, error: 'Email send failed (network error)' }
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  const subject = 'Reset your pharmasync-track password'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#0d9488;padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.2px;">pharmasync-track</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Reset your password</h2>
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Hi ${escapeHtml(name)},
              </p>
              <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your pharmasync-track admin account. Click the button below to choose a new password. This link will expire in 30 minutes.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#0d9488;">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 24px;color:#0d9488;font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${resetUrl}" style="color:#0d9488;text-decoration:underline;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                &copy; ${new Date().getFullYear()} pharmasync-track. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const textContent = `Hi ${name},

We received a request to reset the password for your pharmasync-track admin account.

Reset your password here (link expires in 30 minutes):
${resetUrl}

If you didn't request this, you can safely ignore this email.

- pharmasync-track`

  return sendEmail({
    to,
    toName: name,
    subject,
    htmlContent,
    textContent,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
