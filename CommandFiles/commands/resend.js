const enabledThreads = new Set();

export const meta = {
  name: "resend",
  version: "1.2.0",
  author: "Hugo + VelaBot Revamp",
  description: "♻️ Automatycznie ponownie wysyła usunięte wiadomości (domyślnie włączone).",
  supported: "^4.0.0"
};

const messageStore = {};

// aktywacja dla wszystkich wątków na starcie
export async function onStart({ api }) {
  try {
    const threads = await api.getThreadList(20, null, ["INBOX"]);
    for (const thread of threads) {
      enabledThreads.add(thread.threadID);
    }
    console.log(`[RESEND] Automatycznie aktywowany dla ${enabledThreads.size} czatów.`);
  } catch (err) {
    console.error("[RESEND] Błąd przy inicjalizacji:", err);
  }
}

export async function entry({ event, api, args }) {
  const threadID = event.threadID;

  // komendy zarządzania resend
  if (args && args[0]) {
    const option = args[0].toLowerCase();

    if (option === "on") {
      enabledThreads.add(threadID);
      return api.sendMessage("✅ Funkcja resend została *włączona* dla tego czatu.", threadID);
    }
    if (option === "off") {
      enabledThreads.delete(threadID);
      return api.sendMessage("⛔ Funkcja resend została *wyłączona* dla tego czatu.", threadID);
    }
  }

  // zapis każdej wiadomości
  if (event.body || (event.attachments && event.attachments.length > 0)) {
    messageStore[event.messageID] = {
      body: event.body,
      attachments: event.attachments.map(a => a.url ? a : null).filter(Boolean),
      senderName: event.senderName || "Nieznany użytkownik",
      timestamp: Date.now()
    };
  }

  // reagowanie na usunięcie wiadomości
  if (event.type === "message_unsend" && enabledThreads.has(threadID)) {
    const msg = messageStore[event.messageID];
    if (!msg) return;

    const text = msg.body || "📎 (wiadomość zawierała załącznik)";
    const sender = msg.senderName;

    try {
      await api.sendMessage({
        body: `♻️ *Wiadomość została usunięta!*\n👤 Od: ${sender}\n💬 Treść: ${text}`,
        attachment: msg.attachments
      }, threadID);
    } catch (err) {
      console.error("[RESEND ERROR]", err);
    }
  }

  // czyszczenie starszych wiadomości (oszczędność pamięci)
  const keys = Object.keys(messageStore);
  if (keys.length > 300) {
    for (const key of keys.slice(0, 100)) delete messageStore[key];
  }
}