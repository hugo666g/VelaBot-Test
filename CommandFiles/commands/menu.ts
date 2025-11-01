// @ts-check
import { extractCommandRole, toTitleCase } from "@cassidy/unispectra";
import { ShopClass } from "@cass-plugins/shopV2";

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

export async function entry({ input, output, prefix, multiCommands, money }: CommandContext) {
  const commands = multiCommands.toUnique((i) => i.meta?.name);
  const { shopInv, money: userMoney } = await money.queryItem(input.senderID, "shopInv", "money");
  const shop = new ShopClass(shopInv);

  let result = `🔍 | **Dostępne komendy** 🧰 (${commands.size})\n\n`;

  for (const command of commands.values()) {
    const { name, icon = "📄", shopPrice = 0 } = command.meta;
    const role = await extractCommandRole(command);

    const statusIcon =
      role === InputRoles.ADMINBOX && !input.hasRole(role)
        ? "📦"
        : InputRoles.MODERATORBOT && !input.hasRole(role)
        ? "🛡️"
        : role === InputRoles.ADMINBOT && !input.hasRole(role)
        ? "👑"
        : shop.isUnlocked(name)
        ? icon
        : shop.canPurchase(name, userMoney)
        ? "🔐"
        : "🔒";

    const isAllowed = (!shopPrice || shop.isUnlocked(name)) && input.hasRole(role);
    result += `${statusIcon} ${prefix}${isAllowed ? `**${toTitleCase(name)}**` : `${toTitleCase(name)}`}${
      shopPrice ? ` - $${shopPrice}` : ""
    }\n`;
  }

  result += `\n${UNISpectra.charm} Developed by @**Liane Cagara** 🎀`;

  return output.replyStyled(result, {
    ...style,
    content: {
      text_font: "none",
    },
  });
}