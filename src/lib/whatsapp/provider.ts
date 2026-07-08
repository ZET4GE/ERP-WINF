// Envío de mensajes de WhatsApp detrás de una interfaz única, para poder
// elegir proveedor con una variable de entorno (WHATSAPP_PROVIDER) sin tocar
// el resto del código de recordatorios. Mientras no haya proveedor
// configurado, `sendWhatsAppMessage` no falla: devuelve `sin_configurar` para
// que el cron pueda registrar el intento sin interrumpirse.

export interface WhatsAppSendResult {
  success: boolean;
  error?: string;
}

type Provider = "meta" | "wati" | "twilio";

function getConfiguredProvider(): Provider | null {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (provider === "meta" || provider === "wati" || provider === "twilio") return provider;
  return null;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<WhatsAppSendResult> {
  const provider = getConfiguredProvider();
  if (!provider) return { success: false, error: "sin_configurar" };

  try {
    switch (provider) {
      case "meta":
        return await sendViaMeta(phone, message);
      case "wati":
        return await sendViaWati(phone, message);
      case "twilio":
        return await sendViaTwilio(phone, message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: message };
  }
}

async function sendViaMeta(phone: string, message: string): Promise<WhatsAppSendResult> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { success: false, error: "Faltan META_WHATSAPP_TOKEN / META_WHATSAPP_PHONE_NUMBER_ID" };
  }

  const to = phone.replace(/\D/g, "");
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { success: false, error: `Meta API ${response.status}: ${detail.slice(0, 300)}` };
  }
  return { success: true };
}

async function sendViaWati(phone: string, message: string): Promise<WhatsAppSendResult> {
  const endpoint = process.env.WATI_API_ENDPOINT;
  const apiKey = process.env.WATI_API_KEY;
  if (!endpoint || !apiKey) {
    return { success: false, error: "Faltan WATI_API_ENDPOINT / WATI_API_KEY" };
  }

  const to = phone.replace(/\D/g, "");
  const url = `${endpoint.replace(/\/$/, "")}/api/v1/sendSessionMessage/${to}?messageText=${encodeURIComponent(message)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const detail = await response.text();
    return { success: false, error: `WATI API ${response.status}: ${detail.slice(0, 300)}` };
  }
  return { success: true };
}

async function sendViaTwilio(phone: string, message: string): Promise<WhatsAppSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: "Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM",
    };
  }

  const body = new URLSearchParams({
    From: fromNumber,
    To: `whatsapp:${phone}`,
    Body: message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return { success: false, error: `Twilio API ${response.status}: ${detail.slice(0, 300)}` };
  }
  return { success: true };
}
