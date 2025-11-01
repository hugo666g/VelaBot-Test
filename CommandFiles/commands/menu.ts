import fs from "fs";
import path from "path";

export const meta = {
  name: "menu",
  author: "hugo + liane cagara",
  version: "5.1",
  description: "Wyświetla listę wszystkich komend w stylu VelaBota 🌌",
  otherNames: ["help", "commands", "pomoc"],
  category: "utility",
  role: "user",
};

export const style = {
  title: "🌌 𝗩𝗲𝗹𝗮𝗕𝗼𝘁 𝗚𝗮𝗹𝗮𝘅𝘆 𝗠𝗲𝗻𝘂",
  footer: "MADE WITH ❤️ BY hugo",
};

export async function entry({ args, output }) {
  try {
    const commandsPath = path.join(process.cwd(), "src", "commands");
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js") || f.endsWith(".ts"));

    // Sortowanie
    const sorted = files.sort((a, b) => a.localeCompare(b));
    const perPage = 10;
    const totalPages = Math.ceil(sorted.length / perPage);
    const page = Math.min(Math.max(parseInt(args[0]) || 1, 1), totalPages);

    const slice = sorted.slice((page - 1) * perPage, page * perPage);

    let content = "";

    for (const file of slice) {
      try {
        const command = await import(path.join(commandsPath, file));
        const name = command.meta?.name || file.replace(/\.(js|ts)$/i, "");
        const desc = command.meta?.description || "Brak opisu";
        const author = command.meta?.author || "Nieznany autor";

        content += `✨ **${name}**\n📘 ${desc}\n👤 ${author}\n\n`;
      } catch {
        // Ignorujemy błędne komendy
      }
    }

    content += `📄 Strona ${page}/${totalPages}\n🔢 Wszystkich komend: ${sorted.length}\n\n${style.footer}`;

    await output.replyStyled({
      title: style.title,
      content,
      background: "dark-galaxy",
      font: "neon",
    });
  } catch (err) {
    await output.reply(`❌ Błąd przy wczytywaniu menu:\n${err.message}`);
  }
}