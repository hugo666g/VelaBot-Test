// @ts-check
import { UNIRedux } from "@cassidy/unispectra";

export const meta = {
  name: "prefix",
  author: "Hugo + Liane Cagara",
  version: "4.2.0",
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
    const canv = new CanvCass(CanvCass.preW, CanvCass.preH / 1.7);
    await canv.drawBackground("space"); // ciemne kosmiczne tło VelaBot

    const container = CanvCass.createRect({
      top: canv.top + 50,
      centerX: canv.centerX,
      height: 220,
      width: canv.width,
    });

    canv.drawBox({
      rect: container,
      fill: "rgba(0, 0, 0, 0.55)",
    });

    const margin = 100;
    const ymargin = 20;

    // Nagłówek
    canv.drawText(`💫 VelaBot`, {
      fontType: "cbold",
      size: 70,
      x: container.left + margin,
      y: container.top + ymargin,
      vAlign: "bottom",
      align: "left",
      fill: "white",
    });

    canv.drawText(`v${global.package.version}`, {
      fontType: "cbold",
      size: 50,
      x: container.right - margin,
      y: container.top + ymargin,
      vAlign: "bottom",
      align: "right",
      fill: "rgba(255, 255, 255, 0.7)",
    });

    // Sekcja prefiksu
    canv.drawText(`🔹 Aktualny prefiks:`, {
      fontType: "cbold",
      size: 55,
      x: container.left + margin,
      y: container.bottom - ymargin - 30,
      vAlign: "top",
      align: "left",
      fill: "rgba(255, 255, 255, 0.8)",
    });

    canv.drawText(`[ ${prefix} ]`, {
      fontType: "cbold",
      size: 70,
      x: container.left + margin + 400,
      y: container.bottom - ymargin - 30,
      vAlign: "top",
      align: "left",
      fill: "rgba(255, 255, 255, 0.95)",
    });

    // Dolne komunikaty
    canv.drawText(`💡 Użyj "${prefix}help", aby zobaczyć listę komend.`, {
      fontType: "cbold",
      size: 40,
      x: container.left + ymargin,
      y: canv.bottom - 70,
      vAlign: "top",
      align: "left",
      fill: "rgba(255, 255, 255, 0.9)",
    });

    canv.drawText(`🌠 Spróbuj "${prefix}help szukaj", by znaleźć konkretną komendę.`, {
      fontType: "cbold",
      size: 40,
      x: container.left + ymargin,
      y: canv.bottom - ymargin,
      vAlign: "top",
      align: "left",
      fill: "rgba(255, 255, 255, 0.7)",
    });

    // Efekt tła (neonowe iskry)
    canv.drawText(`✨`, {
      fontType: "cbold",
      size: 200,
      x: canv.right - 200 / 2,
      y: canv.bottom - 120,
      align: "center",
      fill: "white",
    });

    // Odpowiedź
    return output.replyStyled(
      {
        body: `🌌 **Aktualny prefiks:** [ ${prefix} ]  
${UNIRedux.standardLine}  
💡 Użyj **${prefix}menu** lub **${prefix}help**, aby zobaczyć dostępne komendy.`,
        attachment: await canv.toStream(),
      },
      {
        title: "💫 VelaBot",
        titleFont: "cbold",
        contentFont: "none",
      }
    );
  } else {
    obj.next();
  }
}