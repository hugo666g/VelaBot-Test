const axios = require("axios");

module.exports = easyCMD({
  name: "ai",
  description: "🤖 Rozmowa z AI (tekst + obrazki, z pamięcią UID w API)",
  title: "🤖 AI Chat",
  icon: "🤖",
  category: "AI",
  cooldown: 5,
  noRibbonUI: true,
  noLevelUI: true,

  async run(ctx) {
    return main(ctx);
  },
});

async function main({ output, args, input, cancelCooldown }) {
  const API_URL = "https://geminiwebapi.onrender.com/gemini";
  const UID = "cc96ac04-b19a-4960-8f7c-de428f500a6b";
  const APIKEY = "gk_live_S12aMmy515cPOpoUy5hZQX1E0x3YYX1B";
  const MAX_REPLY_LENGTH = 900;

  let prompt = args.join(" ").trim();
  const imageUrl =
    input.attachments && input.attachments[0]?.type === "photo"
      ? input.attachments[0].url
      : "";

  if (!prompt && !imageUrl) {
    cancelCooldown();
    await output.reaction("🔴");
    return output.reply(
      `❗ Podaj pytanie lub odpowiedz na zdjęcie.\n\nPrzykład: ai Jak działa AI?`
    );
  }

  const body = {
    uid: UID,
    ask: prompt || "[obrazek]",
    ...(imageUrl ? { image_url: imageUrl } : {}),
  };

  await output.reaction("🟡"); // w trakcie

  let replyText;
  try {
    const res = await axios.post(API_URL, body, {
      headers: {
        Authorization: `Bearer ${APIKEY}`,
        "Content-Type": "application/json",
      },
      timeout: 40000,
    });

    const data = res.data || {};
    replyText =
      data.response ||
      data.result ||
      data.content ||
      data.output ||
      data.message ||
      "⚠️ Brak odpowiedzi AI.";

    replyText = replyText.trim().slice(0, MAX_REPLY_LENGTH);
  } catch (err) {
    console.error("❌ Błąd Gemini API:", err.message);
    replyText = "⚠️ Wystąpił błąd połączenia z AI.";
  }

  await output.reaction("🟢"); // gotowe

  const info = await output.reply({
    body: replyText + "\n\n***Możesz odpowiedzieć na tę rozmowę.***",
  });

  // Obsługa dalszej rozmowy z AI
  if (info.atReply) {
    info.atReply((rep) => {
      main({ ...rep, args: rep.input.words, cancelCooldown });
    });
  }
}