import fs from "fs";
import path from "path";

export const meta = {
  name: "unsend",
  description: "Przywraca wiadomości usunięte przez użytkowników (anti-unsend)",
  version: "3.0.0",
  author: "Hugo + ChatGPT (VelaBot styl)",
};

const cacheDir = path.join(process.cwd(), "cache", "resend");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

// Magazyn wiadomości (cache w pamięci)
const messageStore = new Map();

// 📦 Zapis każdej nowej wiadomości
export async function message({ event, api }) {
  try {
    const { messageID, attachments, body, senderID, threadID } = event;
    if (!messageID || (!body && (!attachments || attachments.length === 0))) return;

    messageStore.set(messageID, {
      body: body || "",
      attachments: attachments || [],
      senderID,
      threadID,
    });

    // Czyścimy po 1h, by nie obciążać RAM
    setTimeout(() => messageStore.delete(messageID), 3600000);
  } catch (err) {
    console.error("[RESEND:STORE]", err);
  }
}

// 🔁 Gdy ktoś usunie wiadomość
export async function entry({ event, api }) {
  try {
    const { messageID, threadID, author } = event;

    const oldMsg = messageStore.get(messageID);
    if (!oldMsg) return; // Nie ma w pamięci, nie przywracamy

    const { body, attachments, senderID } = oldMsg;
    let msg = `♻️ Użytkownik @${senderID} usunął wiadomość:`;

    // Jeśli była treść
    if (body) msg += `\n\n🗨️ ${body}`;

    // Jeśli były załączniki
    const files = [];
    for (const att of attachments) {
      const ext = att.type === "photo" ? "jpg"
        : att.type === "audio" ? "mp3"
        : att.type === "video" ? "mp4"
        : att.type === "animated_image" ? "gif"
        : "bin";

      const filePath = path.join(cacheDir, `${messageID}.${ext}`);
      const url = att.url || att.previewUrl;

      if (url) {
        const res = await fetch(url);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(filePath, buf);
        files.push(fs.createReadStream(filePath));
      }
    }

    // Wysyłamy wiadomość ponownie
    await api.sendMessage(
      {
        body: msg,
        attachment: files,
        mentions: [{ id: senderID, tag: `@${senderID}` }],
      },
      threadID
    );

    messageStore.delete(messageID);
    console.log(`[RESEND] Przywrócono wiadomość od ${senderID}`);

    // Sprzątanie po 10 min
    setTimeout(() => {
      for (const f of fs.readdirSync(cacheDir)) {
        const fp = path.join(cacheDir, f);
        const stats = fs.statSync(fp);
        if (Date.now() - stats.mtimeMs > 10 * 60 * 1000) fs.unlinkSync(fp);
      }
    }, 10 * 60 * 1000);
  } catch (err) {
    console.error("[RESEND:ENTRY]", err);
  }
  }
