// @ts-check
import { extractCommandRole, toTitleCase, UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "menu",
  author: "@lianecagara",
  description: "Wyświetla wszystkie dostępne komendy bota w jednej liście.",
  version: "3.1.1",
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
  const commands = multiCommands.toUnique((i) => i.meta?.name);

  let result = `🔍 | **Dostępne komendy** 🧰 (${commands.size})\n\n`;

  for (const command of commands.values()) {
    const { name, icon = "📄" } = command.meta;
    result += `${icon} ${prefix}${toTitleCase(name)}\n`;
  }

  result += `\n✨ Stworzony przez: **hugo** 🎀`;

  return output.replyStyled(result, {
    ...style,
    content: {
      text_font: "none",
    },
  });
}