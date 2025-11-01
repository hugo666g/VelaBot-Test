import axios from "axios";

export default easyCMD({
  name: "ai",
  description: "🤖 Rozmowa z AI (tekst + obrazki, z pamięcią UID w API)",
  title: "🤖 AI Chat",
  icon: "🤖",
  category: "AI",
  cooldown: 5,

  async run({ print, edit, onReply, attachments, args, userID }) {
    const API_URL = "https://geminiwebapi.onrender.com/gemini";
    const UID = "cc96ac04-b19a-4960-8f7c-de428f500a6b";
    const APIKEY = "gk_live_S12aMmy515cPOpoUy5hZQX1E0x3YYX1B";
    const MAX_REPLY_LENGTH = 900;

    const prompt = args.join(" ").trim();
    const imageUrl =
      attachments && attachments[0] && attachments[0].type === "photo"
        ? attachments[0].url
        : "";

    if (!prompt && !imageUrl) {
      print("❗ Podaj pytanie lub odpowiedz na zdjęcie.");
      return;
    }

    // 🔧 Wysyłamy zapytanie do Gemini API
    async function queryAI(prompt, imageUrl = "") {
      const body = {
        uid: UID,
        ask: prompt,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };

      try {
        const res = await axios.post(API_URL, body, {
          headers: {
            Authorization: `Bearer ${APIKEY}`,
            "Content-Type": "application/json",
          },
          timeout: 40000,
        });

        const data = res.data || {};
        const reply =
          data.response ||
          data.result ||
          data.content ||
          data.output ||
          data.message ||
          "⚠️ Brak odpowiedzi AI.";

        return reply.trim().slice(0, MAX_REPLY_LENGTH);
      } catch (err) {
        console.error("❌ Błąd Gemini API:", err.message);
        return "⚠️ Wystąpił błąd połączenia z AI.";
      }
    }

    const replyText = await queryAI(prompt || "[obrazek]", imageUrl);
    const sent = await print(replyText);

    // 💬 Obsługa dalszej rozmowy z AI
    onReply(async ({ body, attachments }) => {
      const text = body?.trim() || "";
      const img =
        attachments && attachments[0] && attachments[0].type === "photo"
          ? attachments[0].url
          : "";
      const prompt2 = text || (img ? "[obrazek]" : null);
      if (!prompt2) return;

      const replyNext = await queryAI(prompt2, img);
      await print(replyNext);
    });
  },
});