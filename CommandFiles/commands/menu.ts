// @ts-check
import {
  extractCommandRole,
  toTitleCase,
  UNISpectra,
} from "@cassidy/unispectra";
import { ShopClass } from "@cass-plugins/shopV2";
import stringSimilarity from "string-similarity";

export const meta: CommandMeta = {
  name: "menu",
  description: "📜 Wyświetla listę komend lub szczegóły konkretnej komendy.",
  category: "System",
  usage: "[nazwa komendy]",
  cooldown: 3,
  permissions: 0,
  aliases: ["help", "komendy", "lista"],
  author: "Hugo (VelaBot)",
};

export default async function execute({ api, event, args, commands, output }) {
  try {
    const input = args.join(" ").toLowerCase();
    const allCommands = Array.from(commands.values());
    const commandNames = allCommands.map((cmd) => cmd.config.name);

    // === WYSZUKIWANIE KONKRETNEJ KOMENDY ===
    if (input) {
      const exactMatch = allCommands.find(
        (cmd) => cmd.config.name.toLowerCase() === input
      );

      const bestMatch = stringSimilarity.findBestMatch(
        input,
        commandNames
      ).bestMatch;

      const command =
        exactMatch ||
        (bestMatch.rating > 0.5
          ? allCommands.find(
              (cmd) =>
                cmd.config.name.toLowerCase() === bestMatch.target.toLowerCase()
            )
          : null);

      if (!command) {
        return output.replyStyled({
          title: "❌ Nie znaleziono komendy",
          description:
            `Nie znaleziono komendy **${input}**.\n` +
            `Spróbuj wpisać \`${UNISpectra.prefix}menu\`, aby zobaczyć pełną listę dostępnych komend.`,
          color: UNISpectra.colors.error,
        });
      }

      const cmdInfo = command.config;

      // Informacje o komendzie
      const aliases = cmdInfo.aliases?.length
        ? cmdInfo.aliases.map((a) => `\`${a}\``).join(", ")
        : "Brak";

      const usage = cmdInfo.usages
        ? `\`${UNISpectra.prefix}${cmdInfo.name} ${cmdInfo.usages}\``
        : `\`${UNISpectra.prefix}${cmdInfo.name}\``;

      const role =
        extractCommandRole(cmdInfo.hasPermission) || "Użytkownik";

      return output.replyStyled({
        title: `📘 Komenda: ${toTitleCase(cmdInfo.name)}`,
        description: [
          `**Opis:** ${cmdInfo.description || "Brak opisu."}`,
          `**Kategoria:** ${cmdInfo.commandCategory || "Nieznana"}`,
          `**Uprawnienia:** ${role}`,
          `**Alias(y):** ${aliases}`,
          `**Użycie:** ${usage}`,
          `**Cooldown:** ${cmdInfo.cooldowns || 0}s`,
        ].join("\n"),
        footer: `MADE WITH ❤️ BY Hugo (VelaBot)`,
        color: UNISpectra.colors.info,
      });
    }

    // === LISTA WSZYSTKICH KOMEND ===
    const grouped = {};

    for (const cmd of allCommands) {
      const category = cmd.config.commandCategory || "Inne";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(cmd.config.name);
    }

    const categories = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b)
    );

    const menuText = categories
      .map((cat) => {
        const cmds = grouped[cat]
          .map((c) => `• ${UNISpectra.prefix}${c}`)
          .join("\n");
        return `📂 **${cat}**\n${cmds}`;
      })
      .join("\n\n");

    return output.replyStyled({
      title: `🪐 Lista komend VelaBota`,
      description:
        `Użyj \`${UNISpectra.prefix}menu [nazwa komendy]\`, aby zobaczyć szczegóły.\n\n${menuText}`,
      footer: `MADE WITH ❤️ BY Hugo (VelaBot)`,
      color: UNISpectra.colors.primary,
    });
  } catch (err) {
    console.error("[MENU.TS] Wystąpił błąd:", err);
    return output.replyStyled({
      title: "⚠️ Błąd wewnętrzny",
      description:
        "Podczas generowania listy komend wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę.",
      color: UNISpectra.colors.error,
    });
  }
}

// --- DALSZA CZĘŚĆ OBSŁUGI SYSTEMU MENU ---

// Rozszerzona wersja z obsługą multi-komend i sklepu
export async function multiCommandsHandler({ api, event, args, commands, output }) {
  try {
    const input = args.join(" ").toLowerCase();
    const allCommands = Array.from(commands.values());
    const commandNames = allCommands.map((cmd) => cmd.config.name);

    if (!input) {
      return output.replyStyled({
        title: "📖 Pomoc — tryb wielokrotny",
        description:
          `Aby uzyskać szczegóły dotyczące kilku komend, wpisz:\n` +
          `\`${UNISpectra.prefix}menu komenda1, komenda2, komenda3\``,
        color: UNISpectra.colors.secondary,
        footer: `MADE WITH ❤️ BY Hugo (VelaBot)`,
      });
    }

    const targets = input.split(",").map((x) => x.trim());
    const results = [];

    for (const name of targets) {
      const cmd = allCommands.find(
        (c) => c.config.name.toLowerCase() === name
      );
      if (!cmd) {
        results.push(`❌ **${name}** – nie znaleziono takiej komendy.`);
        continue;
      }

      const info = cmd.config;
      const aliases = info.aliases?.length
        ? info.aliases.map((a) => `\`${a}\``).join(", ")
        : "Brak";
      const usage = info.usages
        ? `\`${UNISpectra.prefix}${info.name} ${info.usages}\``
        : `\`${UNISpectra.prefix}${info.name}\``;
      const role =
        extractCommandRole(info.hasPermission) || "Użytkownik";

      results.push(
        `🔹 **${toTitleCase(info.name)}**\n` +
          `Opis: ${info.description || "Brak opisu."}\n` +
          `Kategoria: ${info.commandCategory || "Nieznana"}\n` +
          `Użycie: ${usage}\n` +
          `Alias(y): ${aliases}\n` +
          `Uprawnienia: ${role}\n` +
          `Cooldown: ${info.cooldowns || 0}s`
      );
    }

    return output.replyStyled({
      title: "📘 Szczegóły wybranych komend",
      description: results.join("\n\n"),
      color: UNISpectra.colors.info,
      footer: `MADE WITH ❤️ BY Hugo (VelaBot)`,
    });
  } catch (err) {
    console.error("[MENU.MULTI] Wystąpił błąd:", err);
    return output.replyStyled({
      title: "⚠️ Wewnętrzny błąd menu",
      description: "Nie udało się przetworzyć kilku komend jednocześnie.",
      color: UNISpectra.colors.error,
    });
  }
}

// --- DODATKOWA INTEGRACJA Z SHOPCLASS (jeśli aktywna) ---
export async function showShopIntegration({ api, event, output }) {
  try {
    const shop = new ShopClass();
    const items = await shop.getAllItems();
    if (!items.length) {
      return output.replyStyled({
        title: "🛒 Sklep VelaBota",
        description: "Brak dostępnych przedmiotów w sklepie.",
        color: UNISpectra.colors.secondary,
        footer: `MADE WITH ❤️ BY Hugo (VelaBot)`,
      });
    }

    const list = items
      .map((i, index) => `${index + 1}. **${i.name}** – ${i.price} 💰`)
      .join("\n");

    return output.replyStyled({
      title: "🛍️ Sklep VelaBota",
      description: `${list}\n\nAby kupić, użyj: \`${UNISpectra.prefix}buy <nazwa>\``,
      color: UNISpectra.colors.success,
      footer: `MADE WITH ❤️ BY Hugo (VelaBot)`,
    });
  } catch (err) {
    console.error("[MENU.SHOP] Błąd integracji sklepu:", err);
    return output.replyStyled({
      title: "⚠️ Błąd sklepu",
      description:
        "Nie udało się pobrać listy przedmiotów ze sklepu. Spróbuj ponownie później.",
      color: UNISpectra.colors.error,
    });
  }
}