// @ts-check
import { toTitleCase } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "menu",
  author: "@lianecagara",
  description: "Wyświetla wszystkie komendy dostępne dla zwykłego użytkownika.",
  version: "3.1.2",
  usage: "{prefix}{name}",
  category: "System",
  role: 0,
  waitingTime: 0.1,
  icon: "🧰",
  otherNames: ["help", "start"],
};

export const style: CommandStyle = {
  title: Cassidy.logo,
  titleFont: "none",
  contentFont: "none",
};

export async function entry({ input, output, prefix, multiCommands }: CommandContext) {
  // Pobieramy wszystkie unikalne komendy
  const commands = multiCommands.toUnique((i) => i.meta?.name);

  // Filtrujemy tylko komendy dla zwykłego użytkownika (role 0)
  const userCommands = Array.from(commands.values()).filter(
    (cmd) => (cmd.meta?.role ?? 0) === 0
  );

  if (!userCommands.length) {
    return output.reply("❌ Brak dostępnych komend dla zwykłego użytkownika.");
  }

  let result = `🔍 | **Dostępne komendy dla użytkownika** 🧰 (${userCommands.length})\n\n`;

  for (const command of userCommands) {
    const { name, icon = "📄" } = command.meta;
    result += `${icon} ${prefix}${toTitleCase(name)}\n`;
  }

  result += `\n✨ Developed by @**Liane Cagara** 🎀`;

  return output.replyStyled(result, {
    ...style,
    content: {
      text_font: "none",
    },
  });
}