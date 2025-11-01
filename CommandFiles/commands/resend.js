// resend.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // jeśli node-fetch nie jest potrzebny w Twoim środowisku, usuń import

export const meta = {
  name: "resend",
  description: "♻️ Anti-unsend — przywraca usunięte wiadomości (domyślnie włączone).",
  version: "1.3.0",
  author: "Hugo + ChatGPT",
  icon: "♻️",
  category: "System",
  role: 2
};

export const style = {
  title: "♻️ Anti-Unsend",
  titleFont: "bold",
  contentFont: "fancy"
};

// pamięć lokalna (RAM) per bot instance
const MESSAGE_CACHE = new Map(); // key: messageID -> value: { body, attachments, senderID, senderName, threadID, ts }
const CACHE_MAX_PER_THREAD = 300;
const TMP_DIR = path.join(process.cwd(), "cache", "resend");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// pomocniczne
function saveToCache(msg) {
  if (!msg || !msg.messageID) return;
  MESSAGE_CACHE.set(msg.messageID, msg);
  // ogranicz ilość wpisów globalnie (opcjonalne)
  if (MESSAGE_CACHE.size > 5000) { // global safety
    // usuń najstarsze 100
    const keys = MESSAGE_CACHE.keys();
    for (let i = 0; i < 100; i++) {
      const k = keys.next().value;
      if (!k) break;
      MESSAGE_CACHE.delete(k);
    }
  }
}
function deleteFromCache(messageID) { if (messageID) MESSAGE_CACHE.delete(messageID); }

// entry - komenda przełączająca (resend on/off) i debug
export async function entry({ output, input, threadsDB, args }) {
  try {
    // tylko admin
    if (!input.isAdmin) return output.reply("❌ Nie masz uprawnień do tej komendy.");

    const threadID = input.threadID;
    const cur = (await threadsDB.queryItem(threadID, "resend"))?.resend;
    const arg = args?.[0]?.toLowerCase();

    if (!arg) {
      // pokaż status
      const status = cur === false ? "WYŁĄCZONY" : "WŁĄCZONY (domyślnie)";
      return output.replyStyled(`♻️ Anti-Unsend: **${status}**\nUżyj: \`${input.prefix}resend on\` lub \`${input.prefix}resend off\`.`, style);
    }

    if (arg === "on") {
      await threadsDB.setItem(threadID, { resend: true });
      return output.replyStyled("✅ Anti-Unsend został WŁĄCZONY w tym wątku.", style);
    } else if (arg === "off") {
      await threadsDB.setItem(threadID, { resend: false });
      return output.replyStyled("⛔ Anti-Unsend został WYŁĄCZONY w tym wątku.", style);
    } else {
      return output.reply("❌ Nieznana opcja. Użyj `on` lub `off`.");
    }
  } catch (e) {
    console.error("[resend.entry error]", e);
    return output.reply("❌ Błąd wewnętrzny (sprawdź logi).");
  }
}

// message - nasłuch nowych wiadomości (zapisujemy do pamięci)
// NOTE: WS3 wywołuje message({ input, ... }) dla przychodzących wiadomości — tak jak w twoim autdl przykładzie
export async function message({ input, threadsDB }) {
  try {
    // sprawdź czy funkcja domyślnie włączona dla tego wątku
    const threadCfg = await threadsDB.getCache(input.threadID);
    if (threadCfg && threadCfg.resend === false) return; // wyłączone

    // przyjmujemy różne nazwy pól — dopasuj do swojego runtime jeśli inne
    const messageID = input.messageID || input.messageID && String(input.messageID);
    if (!messageID) {
      // debug
      // console.log("[resend.message] brak messageID w input:", Object.keys(input || {}));
      return;
    }

    const hasBody = !!input.body;
    const atts = input.attachments || input.attachment || input.attachmentsMeta || [];

    if (!hasBody && (!atts || atts.length === 0)) return;

    const senderName = input.senderName || input.sender || (input.author ? String(input.author) : "Nieznany");
    const storeObj = {
      messageID,
      threadID: input.threadID,
      body: input.body || "",
      attachments: Array.isArray(atts) ? atts : [],
      senderID: input.senderID || input.author || null,
      senderName,
      ts: Date.now()
    };

    saveToCache(storeObj);

    // opcjonalne: ograniczenie cache per thread
    const perThreadKeys = [];
    for (const [k, v] of MESSAGE_CACHE.entries()) if (v.threadID === input.threadID) perThreadKeys.push({ k, ts: v.ts });
    perThreadKeys.sort((a,b)=> a.ts - b.ts);
    if (perThreadKeys.length > CACHE_MAX_PER_THREAD) {
      const remove = perThreadKeys.slice(0, perThreadKeys.length - CACHE_MAX_PER_THREAD);
      remove.forEach(r => MESSAGE_CACHE.delete(r.k));
    }
  } catch (e) {
    console.error("[resend.message error]", e);
  }
}

// unsend - event wywoływany, gdy wiadomość jest usuwana
export async function unsend({ input, output, threadsDB }) {
  try {
    // input powinien mieć: messageID, threadID
    const messageID = input.messageID;
    const threadID = input.threadID;

    if (!messageID || !threadID) {
      // debug
      console.log("[resend.unsend] brak messageID/threadID w input:", Object.keys(input || {}));
      return;
    }

    // sprawdź czy w tym wątku funkcja jest włączona (domyślnie true)
    const threadCfg = await threadsDB.getCache(threadID);
    if (threadCfg && threadCfg.resend === false) return;

    const stored = MESSAGE_CACHE.get(messageID);
    if (!stored) {
      // nic nie mamy w cache — nic do zrobienia
      console.log(`[resend.unsend] brak zapisanej wiadomości dla id=${messageID}`);
      return;
    }

    // Przygotuj treść i załączniki
    let text = `♻️ Użytkownik ${stored.senderName || stored.senderID || ""} usunął wiadomość:`;
    if (stored.body) text += `\n\n🗨️ ${stored.body}`;

    const files = [];

    // attachments handling: spróbuj użyć global.utils.getStreamFromURL jeśli dostępne
    for (const att of (stored.attachments || [])) {
      try {
        // często att ma .url, .previewUrl lub .src
        const url = att.url || att.previewUrl || att.src || att.mediaUrl || att.uri;
        if (!url) continue;

        if (global?.utils?.getStreamFromURL) {
          const stream = await global.utils.getStreamFromURL(url);
          if (stream) files.push(stream);
          continue;
        }

        // fallback: fetch i zapis do pliku tymczasowego
        const res = await fetch(url);
        if (!res.ok) continue;
        const buffer = await res.buffer();
        const ext = (att.type === "photo" || url.match(/\.jpg|\.jpeg|\.png/)) ? "jpg"
                  : (att.type === "video" || url.match(/\.mp4/)) ? "mp4"
                  : (att.type === "audio" || url.match(/\.mp3/)) ? "mp3"
                  : (url.match(/\.gif/)) ? "gif"
                  : "bin";
        const tmpPath = path.join(TMP_DIR, `${messageID}_${Math.random().toString(36).slice(2)}.${ext}`);
        fs.writeFileSync(tmpPath, buffer);
        files.push(fs.createReadStream(tmpPath));
      } catch (e) {
        console.warn("[resend.unsend att error]", e && e.message ? e.message : e);
      }
    }

    // Wyślij przywróconą wiadomość
    await output.replyStyled(
      {
        body: text,
        attachment: files.length ? files : undefined,
        mentions: stored.senderID ? [{ id: stored.senderID, tag: stored.senderName || "@" + stored.senderID }] : undefined
      },
      style
    );

    // sprzątanie: usuń wpis z cache i pliki tymczasowe po kilku sekundach
    deleteFromCache(messageID);
    setTimeout(() => {
      try {
        for (const f of fs.readdirSync(TMP_DIR)) {
          if (f.includes(messageID)) {
            const fp = path.join(TMP_DIR, f);
            try { fs.unlinkSync(fp); } catch {}
          }
        }
      } catch (e) {}
    }, 10000);
  } catch (e) {
    console.error("[resend.unsend error]", e);
  }
}