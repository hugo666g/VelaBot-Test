const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "googleimg",
  description: "🔍 Wyszukuje obrazy przez API Kohi (safe=false)",
  category: "Wyszukiwanie",
  icon: "🖼️",
  async run({ msg, args }) {
    if (!args.length) return msg.reply("⚠️ Podaj frazę do wyszukania.");

    const query = encodeURIComponent(args.join(" "));
    const url = `https://api-library-kohi.onrender.com/api/gmage?q=${query}`;

    try {
      const res = await axios.get(url);
      const results = res.data?.data || [];

      if (!results.length)
        return msg.reply(`❌ Nie znaleziono wyników dla: ${args.join(" ")}`);

      const attachments = [];
      for (const [index, imageUrl] of results.slice(0, 5).entries()) {
        try {
          const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const imgPath = path.join(__dirname, `/cache/${Date.now()}_${index}.jpg`);
          await fs.writeFile(imgPath, imgRes.data);

          if (await fs.pathExists(imgPath)) attachments.push(fs.createReadStream(imgPath));
        } catch (err) {
          console.log("❌ Błąd pobierania obrazu:", err.message);
        }
      }

      if (attachments.length === 0)
        return msg.reply("⚠️ Nie udało się pobrać żadnych obrazów.");

      await msg.reply({
        body: `🔍 Wyniki wyszukiwania dla: ${args.join(" ")}\n📸 Pokazano ${attachments.length} z ${results.length} obrazów.`,
        attachment: attachments
      });

      // usuń pliki po wysłaniu
      for (const file of attachments) {
        if (file.path && (await fs.pathExists(file.path))) fs.unlinkSync(file.path);
      }

    } catch (err) {
      console.error("❌ Błąd API:", err);
      msg.reply("❌ Wystąpił błąd podczas wyszukiwania obrazów.");
    }
  }
};