const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = easyCMD({
  name: "ai",
  meta: {
    otherNames: ["gpt4o", "ai", "ask"],
    author: "From Haji Mix REST API, handled by Liane Cagara",
    description:
      "A versatile assistant that provides information, answers questions, and assists with a wide range of tasks.",
    icon: "🤖",
    version: "1.3.0",
    noPrefix: "both",
  },
  category: "AI",
  title: "GPT-4O FREE 🖼️🎓",
  run(ctx) {
    return main(ctx);
  },
});

async function main(ctx) {
  const { output, args, input } = ctx;

  await output.reaction("🟡");

  let ask = args.join(" ").trim();
  if (!ask && (!input.attachmentUrls || input.attachmentUrls.length === 0)) {
    await output.reaction("🔴");
    return output.reply(
      `🔎 Please provide a question for **gpt**.\n\nExample: gpt what is tralalero?`
    );
  }

  // Dodanie informacji o użytkowniku jeśli dostępne
  let userInfo = "";
  if (ctx.usersDB) {
    const user = await ctx.usersDB.getUserInfo(input.sid);
    const userGame = await ctx.usersDB.getCache(input.sid);
    if (user?.name || userGame?.name) {
      userInfo = `${user?.name || userGame?.name} Info:\nThey have ${Number(
        userGame.money
      ).toLocaleString()} balance.\n`;
    }
  }

  let attachmentsText = "";
  if (input.attachmentUrls && input.attachmentUrls.length > 0) {
    attachmentsText = `\nUser also sent attachments: ${input.attachmentUrls.join(", ")}`;
  }

  const bodyToSend = `${userInfo}Question:\n${ask || "[image]"}${attachmentsText}`;

  try {
    const res = await axios.post(
      "https://haji-mix.up.railway.app/api/gpt4o",
      {
        uid: input.sid + "_7",
        ask: bodyToSend,
      },
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      }
    );

    let replyText = res.data.answer || "⚠️ AI did not return any response.";

    const form = { body: replyText };

    // Obsługa obrazków
    if (Array.isArray(res.data.images) && res.data.images.length > 0) {
      const img = res.data.images[0];
      if (img.url) {
        const imgRes = await axios.get(img.url, { responseType: "arraybuffer" });
        const filePath = path.join(
          process.cwd(),
          "temp",
          `gpt-gen_${Date.now()}_${Math.floor(Math.random() * 1000000)}.png`
        );
        fs.writeFileSync(filePath, Buffer.from(imgRes.data));
        form.attachment = fs.createReadStream(filePath);
        // usuwanie pliku po wysłaniu
        form.attachment.on("end", () => fs.unlinkSync(filePath));
      }
      if (img.description) {
        form.body = img.description + "\n\n" + form.body;
      }
    }

    await output.reaction("🟢");
    const msg = await output.reply(form);

    // Obsługa dalszej konwersacji
    if (msg.atReply) {
      msg.atReply((rep) => {
        main({ ...ctx, args: rep.input.words });
      });
    }
  } catch (err) {
    console.error("❌ Error fetching AI response:", err.message);
    await output.reaction("🔴");
    await output.reply("⚠️ Wystąpił błąd połączenia z AI.");
  }
}