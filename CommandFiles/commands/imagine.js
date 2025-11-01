// imagine.js
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

export const meta = {
  name: "imagine",
  otherNames: ["img","genimg"],
  author: "ChatGPT + Hugo",
  version: "1.0.0",
  description: "Generuje obraz na podstawie opisu (API rapido.zetsu.xyz)",
  usage: "{prefix}{name} [opis]",
  category: "AI",
  noPrefix: "both",
  permissions: [0],
  botAdmin: false,
  waitingTime: 5,
  ext_plugins: { output: "^1.0.0" },
  supported: "^4.0.0"
};

export async function entry({ input, output, args, event }) {
  const prompt = (args || []).join(" ").trim();
  if (!prompt) return output.reply("⚠️ Podaj opis obrazu.\nPrzykład: imagine kosmiczny kot w stylu neonowym");

  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const tmpPath = path.join(cacheDir, `imagine_${Date.now()}.png`);

  // informacja o generowaniu (wysyłamy prosty tekst)
  const loadingMsg = await output.reply("⏳ Generuję obraz, proszę czekać...");

  try {
    const resp = await axios.get(
      `https://rapido.zetsu.xyz/api/sd?prompt=${encodeURIComponent(prompt)}`,
      { responseType: "arraybuffer", timeout: 120000 }
    );

    await fs.writeFile(tmpPath, Buffer.from(resp.data));

    // Wyślij jako stream - zgodne z fca/ws3
    await output.reply({
      body: `🖼️ Obraz wygenerowany dla promptu:\n» ${prompt}`,
      attachment: fs.createReadStream(tmpPath)
    });

    // usuń loading (jeśli platforma ma unsend - tutaj próbujemy, jeśli output.unsend istnieje)
    if (loadingMsg && typeof loadingMsg === "object" && loadingMsg.messageID && output.unsend) {
      try { await output.unsend(loadingMsg.messageID); } catch {}
    }

    // usuń plik z cache
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e) {}

  } catch (err) {
    console.error("[IMAGINE ERROR]", err && err.message ? err.message : err);
    // spróbuj usunąć loading
    if (loadingMsg && typeof loadingMsg === "object" && loadingMsg.messageID && output.unsend) {
      try { await output.unsend(loadingMsg.messageID); } catch {}
    }
    return output.reply("❌ Wystąpił błąd podczas generowania obrazu. Spróbuj ponownie później.");
  }
}