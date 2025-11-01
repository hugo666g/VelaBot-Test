// @ts-check
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { easyCMD } from "@cassidy/unispectra";

export default easyCMD({
  name: "imagine",
  description: "🎨 Generuje obraz na podstawie opisu (API rapido.zetsu.xyz)",
  category: "AI",
  icon: "🎨",
  cooldown: 5,
  extra: {
    style: { title: "🪐 Imagine", contentFont: "fancy" }
  },

  async run({ print, args }) {
    const prompt = args.join(" ");
    if (!prompt)
      return print("⚠️ Podaj opis obrazu.\n\n💡 Przykład: `imagine kosmiczny kot w stylu neonowym`");

    const loadingMsg = await print("⏳ Generuję obraz, proszę czekać...");

    try {
      // Pobranie obrazu z API
      const response = await axios.get(
        `https://rapido.zetsu.xyz/api/sd?prompt=${encodeURIComponent(prompt)}`,
        { responseType: "arraybuffer" }
      );

      // Zapis do pliku tymczasowego
      const cacheDir = path.join(process.cwd(), "cache");
      await fs.ensureDir(cacheDir);
      const imgPath = path.join(cacheDir, `imagine_${Date.now()}.png`);
      await fs.writeFile(imgPath, Buffer.from(response.data));

      // Usunięcie komunikatu „Generuję...”
      await loadingMsg.delete();

      // Wysłanie końcowego wyniku
      await print({
        content: `🖼️ Obraz wygenerowany dla promptu:\n» ${prompt}`,
        files: [imgPath]
      });

      console.log(`[IMAGINE] Obraz wygenerowany i wysłany: ${imgPath}`);
    } catch (error) {
      console.error("[IMAGINE ERROR]", error.message);
      await print("❌ Wystąpił błąd podczas generowania obrazu. Spróbuj ponownie później.");
    }
  }
});