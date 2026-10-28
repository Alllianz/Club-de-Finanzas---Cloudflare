import * as brevo from "@getbrevo/brevo";

let apiInstance: brevo.TransactionalEmailsApi | null = null;

function getBrevoApi(): brevo.TransactionalEmailsApi | null {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  if (!apiInstance) {
    apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }
  return apiInstance;
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const brevoClient = getBrevoApi();

  if (!brevoClient) {
    console.warn(`\n======================================================`);
    console.warn(`[DEV OTP NOTIFICATION] Para: ${toEmail} | Código OTP: ${otp}`);
    console.warn(`(Configura BREVO_API_KEY en .env si deseas envíos reales)`);
    console.warn(`======================================================\n`);
    return;
  }

  const mail = new brevo.SendSmtpEmail();
  mail.subject = "Código de Acceso - Club de Finanzas UBA";
  mail.htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f8fb; margin: 0; padding: 40px 20px; }
          .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
          .logo-text { font-size: 20px; font-weight: 700; color: #123f89; margin-bottom: 24px; }
          .code-box { background: #f0f5ff; border: 1px dashed #7ca0d8; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #123f89; font-family: monospace; }
          .footer { font-size: 13px; color: #64748b; margin-top: 24px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-text">Club de Finanzas UBA</div>
          <h2>Tu código de acceso</h2>
          <p>Utiliza el siguiente código para iniciar sesión en el panel de administración:</p>
          <div class="code-box">
            <span class="code">${otp}</span>
          </div>
          <p class="footer">Este código expira en <b>${process.env.OTP_EXPIRATION_MINUTES || 15} minutos</b>.<br>Si no solicitaste este código, puedes ignorar este correo.</p>
        </div>
      </body>
    </html>
  `;
  mail.sender = {
    name: process.env.BREVO_SENDER_NAME || "Club de Finanzas UBA",
    email: process.env.BREVO_SENDER_EMAIL || "noreply@clubdefinanzasuba.com",
  };
  mail.to = [{ email: toEmail }];

  try {
    const response = await brevoClient.sendTransacEmail(mail);
    console.log("[BREVO OTP SENT]", {
      toEmail,
      messageId: (response as { messageId?: string })?.messageId || null,
    });
  } catch (error) {
    console.error("[BREVO OTP ERROR]", { toEmail, error });
    throw new Error("No se pudo enviar el email con el código OTP.");
  }
}
