// googleimg.js
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

export const meta = {
  name: "googleimg",
  otherNames: ["gimg","imgsearch"],
  author: "ChatGPT + Hugo",
  version: "1.0.0",
  description: "Wyszukuje obrazy przez API Kohi (safe=false)",
  usage: "{prefix}{name} [fraza]",
  category: "🔍 Wyszukiwanie",
  noPrefix: "both",
  permissions: [0],
  botAdmin: false,
  waitingTime: 3,
  ext_plugins: { output: "^1.0.0" },
  supported: "^4.0.0"
};

export async function entry({ input, output, args, event }) {
  if (!args || args.length === 0) return output.reply("⚠️ Podaj frazę do wyszukania.");

  const query = encodeURIComponent(args.join(" "));
  const url = `https://api-library-kohi.onrender.com/api/gmage?q=${query}`;

  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);

  try {
    const res = await axios.get(url, { timeout: 15000 });
    const results = (res.data && res.data.data) ? res.data.data : [];

    if (!results.length) return output.reply(`❌ Nie znaleziono wyników dla: ${args.join(" ")}`);

    const attachments = [];
    for (const [i, imageUrl] of results.slice(0, 5).entries()) {
      try {
        const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
        const imgPath = path.join(cacheDir, `${Date.now()}_${i}.jpg`);
        await fs.writeFile(imgPath, imgRes.data);
        if (await fs.pathExists(imgPath)) attachments.push(fs.createReadStream(imgPath));
      } catch (err) {
        console.log("[googleimg] error downloading:", err && err.message ? err.message : err);
      }
    }

    if (!attachments.length) return output.reply("⚠️ Nie udało się pobrać żadnych obrazów.");

    await output.reply({
      body: `🔍 Wyniki wyszukiwania dla: **${args.join(" ")}**\n📸 Pokazano ${attachments.length} z ${results.length} obrazów.`,
      attachment: attachments
    });

    // usuń pliki z cache
    for (const s of attachments) {
      try { if (s.path && fs.existsSync(s.path)) fs.unlinkSync(s.path); } catch (e) {}
    }
  } catch (err) {
    console.error("[GOOGLEIMG ERROR]", err && err.message ? err.message : err);
    return output.reply("❌ Wystąpił błąd podczas wyszukiwania obrazów.");
  }
}