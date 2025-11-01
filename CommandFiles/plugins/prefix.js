// @ts-check
import { UNIRedux } from "@cassidy/unispectra";

export const meta = {
  name: "prefix",
  author: "Hugo + Liane Cagara",
  version: "4.3.0",
  description: "Wyświetla aktualny prefiks bota w stylu Vela.",
  supported: "^4.0.0",
  order: 4,
  type: "plugin",
  after: ["input", "output"],
};

/**
 * @param {CommandContext} obj
 */
export async function use(obj) {
  const { input, output, prefix } = obj;
  const words = ["prefix", "velabot", "vela", "bot", "prefiks"];

  if (
    words.some((w) => `${w}`.toLowerCase() === input.toLowerCase()) ||
    input.text.trim() === prefix
  ) {
    return output.replyStyled(
      {
        body: `💫 **VelaBot**  
${UNIRedux.standardLine}  
🔹 **Aktualny prefiks:** \`${prefix}\`  
💡 Użyj **${prefix}help** lub **${prefix}menu**, aby zobaczyć wszystkie komendy.`,
      },
      {
        title: "🌌 Prefiks bota",
        titleFont: "cbold",
        contentFont: "fancy",
      }
    );
  } else {
    obj.next();
  }
}