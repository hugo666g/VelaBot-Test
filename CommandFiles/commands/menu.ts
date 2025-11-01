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
  author: "@lianecagara",
  description:
    "Działa jako centralne centrum — jak menu Start — zapewnia użytkownikom przegląd dostępnych komend, ich funkcji oraz dostęp do szczegółów każdej z nich. Pomaga szybko odnaleźć funkcje bota.",
  version: "3.1.1",
  usage: "{prefix}{name} [nazwaKomendy]",
  category: "System",
  role: 0,
  waitingTime: 0.1,
  requirement: "3.0.0",
  icon: "🧰",
  otherNames: ["start", "help"],
};

export const style: CommandStyle = {
  title: Cassidy.logo,
  titleFont: "none",
  contentFont: "none",
};

// 🧭 Podstawowe komendy
const basicCommands = {
  register: "Zmień swoją nazwę użytkownika.",
  items: "Wyświetl i użyj przedmiotów z ekwipunku.",
  gift: "Odbierz swój darmowy prezent/nagrodę co godzinę.",
  bal: "Sprawdź swoje pieniądze, kolekcje, punkty bitewne i rangi.",
  bank: "Przechowuj inne przedmioty i pieniądze w banku.",
  active: "Zobacz aktywnych użytkowników.",
  streak: "Odbierz swój codzienny bonus/serię.",
  vault: "Dodatkowy magazyn na przedmioty.",
  bag: "Jeszcze jeden magazyn na przedmioty.",
  rank: "Zobacz swoje doświadczenie (EXP).",
  ratings: "Przeglądaj i dodawaj opinie oraz recenzje.",
  report: "Zgłoś coś administratorowi.",
  trade: "Kupuj i sprzedawaj przedmioty.",
  uid: "Zobacz swój unikalny identyfikator użytkownika (UID).",
  pet: "Kupuj, karm i zarabiaj na swoich zwierzakach!",
  rosashop: "Kupuj przedmioty związane ze zwierzakami.",
  garden: "Zasadź i rozwijaj swój ogród!",
  arena: "Turniej AI lub PvP zwierzaków, w którym możesz zarabiać!",
  mtls: "Twórz, kupuj i przekształcaj swoje pieniądze w tokeny (nie giełda!).",
};

export async function entry({
  input,
  output,
  prefix,
  commandName,
  commandName: cmdn,
  money,
  multiCommands,
  InputRoles,
}: CommandContext) {
  const commands = multiCommands.toUnique((i) => i.meta?.name);

  const args = input.arguments;
  const { logo: icon } = global.Cassidy;
  const { shopInv, money: userMoney } = await money.queryItem(
    input.senderID,
    "shopInv",
    "money"
  );
  const shop = new ShopClass(shopInv);

  // ————————————————————————————————————————————————
  // 🔹 Wyświetlanie WSZYSTKICH komend lub jeśli gry są wyłączone
  // ————————————————————————————————————————————————
  if (
    String(args[0]).toLowerCase() === "all" ||
    (!args[0] && !Cassidy.allowGames)
  ) {
    const categorizedCommands: Record<string, CassidySpectra.CassidyCommand[]> =
      commands.values().reduce((categories, command) => {
        const category = command.meta.category || "Różne";
        if (!categories[category]) categories[category] = [];
        categories[category].push(command);
        return categories;
      }, {});
    const dontPrio: CassidySpectra.CommandTypes[] = ["arl_g", "cplx_g"];

    const getSumPrioIndex = (commands: CassidySpectra.CassidyCommand[]) => {
      if (!commands.length) return 0;

      return commands.reduce((sum, cmd) => {
        const idx = dontPrio.indexOf(cmd.meta.cmdType) * 5;
        return sum + (idx === -1 ? 0 : -idx);
      }, 0);
    };

    const sortedCategories = Object.keys(categorizedCommands).sort((a, b) => {
      const aCommands = categorizedCommands[a];
      const bCommands = categorizedCommands[b];

      const aPrio = getSumPrioIndex(aCommands);
      const bPrio = getSumPrioIndex(bCommands);

      if (aPrio !== bPrio) {
        return aPrio - bPrio;
      }

      return a.localeCompare(b);
    });

    let result = ``;

    for (const category of sortedCategories) {
      result += `${UNISpectra.arrowFromB} 📁 **${category}** (${categorizedCommands[category].length})\n`;
      for (const command of categorizedCommands[category]) {
        const { name, icon, shopPrice = 0 } = command.meta;
        const role = await extractCommandRole(command);
        const statusIcon =
          role === InputRoles.ADMINBOX && !input.hasRole(role)
            ? "📦"
            : InputRoles.MODERATORBOT && !input.hasRole(role)
            ? "🛡️"
            : role === InputRoles.ADMINBOT && !input.hasRole(role)
            ? "👑"
            : shop.isUnlocked(name)
            ? icon || "📄"
            : shop.canPurchase(name, userMoney)
            ? "🔐"
            : "🔒";

        let isAllowed =
          (!shopPrice || shop.isUnlocked(name)) && input.hasRole(role);
        result += `${statusIcon} ${toTitleCase(name)},   `;
      }
      result += `\n${UNISpectra.standardLineOld}\n`;
    }
    result = result.trim();

    result += `\n${UNISpectra.arrow} Szczegóły komendy: **${prefix}${commandName} <nazwa>**\n`;

    const resultStr = `🔍 | **Dostępne komendy** 🧰 (${commands.size})\n\n${result}${UNISpectra.charm} Stworzone przez @**hugo** 🎀`;
    return output.reply(resultStr);
}

  // ————————————————————————————————————————————————
  // 🔎 Wyszukiwanie komendy
  // ————————————————————————————————————————————————
  if (args[0]) {
    const searchQuery = args.join(" ").toLowerCase();
    const foundCommand = commands.find(
      (command) =>
        command.meta.name.toLowerCase() === searchQuery ||
        command.meta.otherNames?.includes(searchQuery)
    );

    if (foundCommand) {
      const { name, description, usage, category, author, icon, role } =
        foundCommand.meta;

      const roleLabel =
        role === InputRoles.ADMINBOT
          ? "👑 Administrator Bota"
          : role === InputRoles.MODERATORBOT
          ? "🛡️ Moderator"
          : role === InputRoles.ADMINBOX
          ? "📦 Administrator Czatów"
          : "👤 Użytkownik";

      const usageStr = usage
        ? `📘 **Użycie:** ${usage.replace("{prefix}", prefix)}`
        : "";
      const descriptionStr = description
        ? `💬 **Opis:** ${description}`
        : "Brak opisu dla tej komendy.";

      const cmdInfo = [
        `${icon || "🧩"} **${toTitleCase(name)}**`,
        descriptionStr,
        usageStr,
        `📂 **Kategoria:** ${category || "Różne"}`,
        `👨‍💻 **Autor:** ${author || "Nieznany"}`,
        `🔐 **Uprawnienia:** ${roleLabel}`,
      ]
        .filter(Boolean)
        .join("\n");

      return output.reply(`✨ | **Szczegóły komendy**\n\n${cmdInfo}`);
    }

    // ❌ Brak dopasowania → podpowiedź
    const allCommandNames = commands.map((c) => c.meta.name);
    const matches = stringSimilarity.findBestMatch(searchQuery, allCommandNames);
    const best = matches.bestMatch?.target;

    return output.reply(
      `❌ Nie znaleziono komendy o nazwie **${searchQuery}**.\n\nCzy chodziło Ci o: **${best}**?`
    );
  }

  // ————————————————————————————————————————————————
  // 📄 Stronicowanie lub domyślny widok
  // ————————————————————————————————————————————————
  const perPage = 10;
  const pageArg = Number(args[0]) || 1;
  const totalPages = Math.ceil(commands.size / perPage);
  const start = (pageArg - 1) * perPage;
  const end = start + perPage;

  const pageCommands = commands.toArray().slice(start, end);

  let pageOutput = `📋 | **Menu komend** (Strona ${pageArg}/${totalPages})\n\n`;

  for (const command of pageCommands) {
    const { name, description, icon, shopPrice = 0 } = command.meta;
    const shortDesc =
      description?.length > 60
        ? description.slice(0, 60) + "..."
        : description || "Brak opisu.";
    const priceText = shopPrice ? `💰 ${abbreviateNumber(shopPrice)} | ` : "";
    pageOutput += `${icon || "🔹"} **${toTitleCase(
      name
    )}** — ${priceText}${shortDesc}\n`;
  }

  pageOutput += `\n📘 Aby zobaczyć szczegóły konkretnej komendy, wpisz:\n➡️ ${prefix}${cmdn} <nazwa>\n`;
  pageOutput += `💫 MADE WITH ❤️ BY hugo`;

  return output.reply(pageOutput);
}