import { getAllCommands } from "../core/commandLoader.js";
import { extractCommandRole } from "../utilities/roles.js";

export const meta = {
  name: "menu",
  author: "hugo + liane cagara",
  version: "5.0",
  description: "Wyświetla listę wszystkich komend w stylu VelaBota 🌌",
  otherNames: ["help", "commands", "pomoc"],
  role: extractCommandRole("user"),
  category: "utility",
};

export const style = {
  title: "🌌 𝗩𝗲𝗹𝗮𝗕𝗼𝘁 𝗚𝗮𝗹𝗮𝘅𝘆 𝗠𝗲𝗻𝘂",
  titleFont: "fancy",
  contentFont: "neon",
  background: "dark-galaxy",
  footer: "MADE WITH ❤️ BY hugo",
};

export async function entry({ args, output }) {
  const page = parseInt(args[0]) || 1;
  const allCommands = getAllCommands();

  // Sortuj alfabetycznie
  const commandsSorted = allCommands.sort((a, b) =>
    a.meta.name.localeCompare(b.meta.name)
  );

  // Ilość na stronę
  const perPage = 10;
  const totalPages = Math.ceil(commandsSorted.length / perPage);

  // Sprawdź zakres
  if (page < 1 || page > totalPages) {
    return output.replyStyled({
      title: style.title,
      content: `❌ Nie ma takiej strony (${page}). Wpisz numer od 1 do ${totalPages}.`,
      ...style,
    });
  }

  const start = (page - 1) * perPage;
  const commandsPage = commandsSorted.slice(start, start + perPage);

  // Format listy
  const formattedList = commandsPage
    .map(
      (cmd, i) =>
        `✨ **${cmd.meta.name}**\n📘 ${cmd.meta.description || "Brak opisu"}\n👤 ${cmd.meta.author || "Nieznany autor"}\n`
    )
    .join("\n");

  // Wiadomość końcowa
  const message = `${formattedList}\n\n📄 Strona ${page}/${totalPages}\n🔢 Wszystkich komend: ${allCommands.length}\n\n${style.footer}`;

  await output.replyStyled({
    title: style.title,
    content: message,
    ...style,
  });
}