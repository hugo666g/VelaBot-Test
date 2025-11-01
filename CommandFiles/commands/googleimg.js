const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = easyCMD({
  name: "googleimg",
  description: "🔍 Wyszukuje obrazy przez API Kohi (safe=false)",
  title: "🔍 Wyszukiwarka obrazów",
  icon: "🔍",
  category: "Wyszukiwanie",
  cooldown: 3,

  async run({ output, args }) {
    if (!args[0]) {
      return output.reply("⚠️ Podaj frazę do wyszukania.");
    }

    const query = encodeURIComponent(args.join(" "));
    const url = `https://api-library-kohi.onrender.com/api/gmage?q=${query}`;

    try {
      const res = await axios.get(url);
      const results = res.data?.data || [];

      if (!results.length) {
        return output.reply(`❌ Nie znaleziono wyników dla: **${args.join(" ")}**`);
      }

      // 📂 Tworzymy folder cache, jeśli nie istnieje
      const cacheDir = path.join(__dirname, "..", "cache");
      await fs.ensureDir(cacheDir);

      const attachments = [];
      for (const [index, imageUrl] of results.slice(0, 5).entries()) {
        try {
          const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const imgPath = path.join(cacheDir, `${Date.now()}_${index}.jpg`);
          await fs.writeFile(imgPath, imgRes.data);
          attachments.push(fs.createReadStream(imgPath));
        } catch (err) {
          console.log("⚠️ Błąd pobierania obrazu:", err.message);
        }
      }

      if (!attachments.length) {
        return output.reply("⚠️ Nie udało się pobrać żadnych obrazów.");
      }

      const message = `🔍 Wyniki wyszukiwania dla: **${args.join(" ")}**\n📸 Znaleziono ${results.length} obrazów (pokazano 5).`;

      await output.reply({
        body: message,
        attachment: attachments
      });

      // 🧹 Automatyczne czyszczenie plików po wysłaniu
      for (const stream of attachments) {
        try {
          const filePath = stream.path;
          if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
          console.log("⚠️ Błąd przy usuwaniu cache:", err.message);
        }
      }

    } catch (err) {
      console.error("❌ Błąd API Kohi:", err.message);
      output.reply("❌ Wystąpił błąd podczas wyszukiwania obrazów. Spróbuj ponownie później.");
    }
  }
});