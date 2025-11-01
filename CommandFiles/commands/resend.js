import fs from "fs";
import path from "path";

export const meta = {
  name: "resend",
  description: "♻️ Przywraca usunięte wiadomości (anti-unsend system).",
  version: "3.0.0",
  author: "Hugo + ChatGPT (VelaBot styl)",
  icon: "♻️",
  category: "System",
  role: 2,
};

export const style = {
  title: "♻️ Anti-Unsend System",
  titleFont: "bold",
  contentFont: "fancy",
};

const cacheDir = path.join(process.cwd(), "cache", "resend");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

const messageCache = new Map();

// 🟢 Komenda główna (on/off)
export async function entry({ output, input, threadsDB, args }) {
  if (!input.isAdmin) return output.reply("❌ Nie masz uprawnień do tej komendy.");

  const current = (await threadsDB.queryItem(input.threadID, "resend"))?.resend;
  const choice =
    args[0] === "on" ? true :
    args[0] === "off" ? false :
    current ? !current : true;

  await threadsDB.setItem(input.threadID, { resend: choice });

  return output.replyStyled(
    `✅ Anti-Unsend został **${choice ? "włączony" : "wyłączony"}**.`,
    style
  );
}

// 📩 Nasłuch każdej wiadomości — zapis do cache
export async function message({ input, threadsDB }) {
  const thread = await threadsDB.getCache(input.threadID);
  if (thread.resend === false) return;

  if (!input.messageID || (!input.body && (!input.attachments?.length))) return;

  messageCache.set(input.messageID, {
    body: input.body || "",
    attachments: input.attachments || [],
    senderID: input.senderID,
    threadID: input.threadID,
  });

  // Auto cleanup po 1h
  setTimeout(() => messageCache.delete(input.messageID), 3600000);
}

// 🗑️ Event usunięcia wiadomości
export async function event({ input, output, threadsDB }) {
  try {
    if (input.type !== "message_unsend") return;
    const thread = await threadsDB.getCache(input.threadID);
    if (thread.resend === false) return;

    const oldMsg = messageCache.get(input.messageID);
    if (!oldMsg) return;

    const { body, attachments, senderID } = oldMsg;
    let text = `♻️ Użytkownik @${senderID} usunął wiadomość:`;
    if (body) text += `\n\n🗨️ ${body}`;

    const files = [];
    for (const att of attachments) {
      const ext =
        att.type === "photo" ? "jpg" :
        att.type === "video" ? "mp4" :
        att.type === "audio" ? "mp3" :
        att.type === "animated_image" ? "gif" : "bin";

      const filePath = path.join(cacheDir, `${input.messageID}.${ext}`);
      const url = att.url || att.previewUrl;
      if (!url) continue;

      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filePath, buf);
      files.push(fs.createReadStream(filePath));
    }

    await output.replyStyled(
      {
        body: text,
        attachment: files,
        mentions: [{ id: senderID, tag: `@${senderID}` }],
      },
      style
    );

    messageCache.delete(input.messageID);
  } catch (err) {
    console.error("[RESEND ERROR]", err);
  }
}