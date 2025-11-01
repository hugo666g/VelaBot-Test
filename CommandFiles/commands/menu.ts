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
    "Działa jako centralny hub, podobnie do Menu Start, pokazując użytkownikom dostępne komendy, ich funkcje i szczegóły. Ułatwia szybkie poruszanie się po funkcjach bota.",
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

const basicCommands = {
  register: "Zmień swoją nazwę użytkownika.",
  items: "Wyświetl i używaj **przedmiotów** z ekwipunku.",
  gift: "Odbierz swój godzinny darmowy prezent/nagrody.",
  bal: "Sprawdź swoje wirtualne **pieniądze**, kolekcje, punkty bitew i rangę.",
  bank: "Przechowuj inne **przedmioty** i **pieniądze** w oddzielnym banku.",
  active: "Zobacz **aktywnych** użytkowników.",
  streak: "Odbierz swój **dzienny** bonus/serię.",
  vault: "Dodatkowe **miejsce** na przedmioty.",
  bag: "Kolejne dodatkowe **miejsce** na przedmioty.",
  rank: "Sprawdź swój **EXP**.",
  ratings: "Wyświetl i napisz **oceny i recenzje**",
  report: "Zgłoś **coś** administratorowi.",
  trade: "**Kup i sprzedawaj** przedmioty.",
  uid: "Zobacz swój UNIKALNY ID użytkownika.",
  pet: "Kup, karm i **zarabiaj** na swoich zwierzakach!",
  rosashop: "Kup coś związanego ze **zwierzakami**.",
  garden: "Uprawiaj **ogród** tutaj!",
  arena: "Turniej AI lub PvP dla zwierzaków, gdzie możesz **zarobić**!",
  mtls: "Twórz, kupuj, konwertuj swoje **pieniądze** na **mint** (To nie jest system akcji).",
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

  // Wszystkie komendy w wersji "all"
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
      if (aPrio !== bPrio) return aPrio - bPrio;
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

        result += `${statusIcon} ${toTitleCase(name)},   `;
      }
      result += `\n${UNISpectra.standardLineOld}\n`;
    }
    result = result.trim();
    result += `\n${UNISpectra.arrow} Szczegóły komendy: **${prefix}${commandName} <komenda>**\n`;
    const resultStr = `🔍 | **Dostępne Komendy** 🧰 (${commands.size})\n\n${result}${UNISpectra.charm} Stworzone przez @**Liane Cagara** 🎀`;
    return output.reply(resultStr);
  }

  // Wyszukiwanie komend
  else if (
    String(args[0]).toLowerCase() === "search" ||
    String(args[0]).toLowerCase() === "find"
  ) {
    const searchStr = String(args[1] || "");
    if (!searchStr) {
      return output.reply(
        `🔎 Wyszukaj **komendę** podając słowo kluczowe jako argument.\n\n**PRZYKŁAD**: ${prefix}${commandName} search shop`
      );
    }
    const getSortedFinds = <T>(
      search: string,
      candidates: { tokens: string[]; data: T }[]
    ) => {
      const results = candidates
        .map((candidate) => {
          const scores = candidate.tokens.map((t) =>
            stringSimilarity.compareTwoStrings(search.toLowerCase(), t)
          );
          const scoreSum = scores.reduce((acc, score) => score + acc, 0);
          return { candidate, score: scoreSum, data: candidate.data };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      return results;
    };
    const cmds = commands.values().map((command) => {
      const meta = command.meta;
      meta.seo ??= [];
      meta.otherNames ??= [];
      meta.description ??= "";
      meta.usage ??= "";
      meta.category ??= "";
      const combined = `${meta.category} ${meta.name} ${meta.otherNames.join(
        " "
      )} ${meta.description} ${meta.usage} ${meta.seo.join(" ")}`;
      const split = combined.split(/\s+/);
      return { ...command, meta, split };
    });
    const results = getSortedFinds(
      searchStr,
      cmds.map((i) => ({ tokens: i.split, data: i }))
    );
    return output.reply(
      `🔎 **Wyniki Wyszukiwania** (${results.length})\n${UNISpectra.standardLine}\n${
        results.length === 0
          ? `❓ Brak wyników.`
          : results
              .map((i) => ({ ...i.data.meta, i }))
              .map(
                (i) =>
                  `${i.icon ?? "📁"} ${prefix}**${i.name}**${
                    i.otherNames.length > 0
                      ? `\nAlias: **${i.otherNames.join(", ")}**`
                      : ""
                  }\n${UNISpectra.arrowFromT} ${
                    i.description ?? "Brak opisu"
                  }`
              )
              .join(`\n${UNISpectra.standardLine}\n`)
      }`
    );
  }

  // Komendy podstawowe (basics)
  else if (String(args[0]).toLowerCase() === "basics") {
    const entries = Object.entries(basicCommands);
    const filteredEntries = await Promise.all(
      entries.map(async (i) => {
        const command = multiCommands.getOne(i[0]);
        if (!command) return null;
        const role = await extractCommandRole(command);
        return i;
      })
    );
    const validEntries = filteredEntries.filter(Boolean);
    const basicStr = validEntries
      .map(
        (i) =>
          `${multiCommands.getOne(i[0])?.meta?.icon ?? "📁"} ${prefix}${i[0]} ${
            UNISpectra.arrowFromT
          } ${i[1]}`
      )
      .join("\n");

    let strs = [
      `${UNISpectra.arrow} Jesteś nowy w grze? Oto ***PODSTAWY***`,
      ``,
      `⌨️ Aby używać komend, musisz podawać prefiksy. Przykład: wpisz "${prefix}gift" bez cudzysłowów aby użyć komendy gift.`,
      ``,
      `🔎 Możesz używać tylko komend, które **istnieją** w menu.`,
      ``,
      `‼️ Niektóre komendy wymagają **wyższej roli** aby je użyć.`,
      ``,
      `📝 Nie używaj czcionek w komendach. Bot nie akceptuje "${prefix}**gift**" ponieważ ma dodatkowe style.`,
      ``,
      `🎒 Co to jest klucz przedmiotu lub ekwipunku? Przykład:`,
      `***PRZYKŁADOWE UI***: 🌒 **Shadow Coin** [shadowCoin]`,
      `Klucz "shadowCoin" jest używany w komendach wymagających podania klucza. Np.: "${prefix}pet-feed Liane shadowCoin" - nakarmisz **Liane** za pomocą 🌒 **Shadow Coin**.`,
      ``,
      `✅ **Podstawowe Komendy**`,
      basicStr,
      ``,
      `${UNISpectra.arrowFromT} Spróbuj ***Eksplorować*** więcej komend!`,
      `${UNISpectra.arrowFromT} Wyświetl według strony: **${prefix}${commandName} <strona>**`,
      `${UNISpectra.arrowFromT} Wyświetl wszystkie: **${prefix}${commandName} all**`,
      `${UNISpectra.charm} Stworzone przez @**Liane Cagara** 🎀`,
    ].join("\n");

    return output.replyStyled(strs, {
      ...style,
      content: {
        text_font: "none",
      },
    });
  }
}