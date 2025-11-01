const axios = require("axios");

module.exports = easyCMD({
  name: "zgadnij",
  description: "🧩 Zgadnij kraj po fladze! (easy|medium|hard)",
  category: "zabawa",
  cooldown: 5,
  async run(ctx) {
    const { args, output } = ctx;

    // 🔠 Normalizacja
    function normalize(text = "") {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[łŁ]/g, "l")
        .replace(/[-_',.()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const aliases = {
      usa: "stany zjednoczone",
      uk: "wielka brytania",
      gb: "wielka brytania",
      england: "wielka brytania",
      drcongo: "demokratyczna republika konga",
      congo: "kongo",
      "south korea": "korea poludniowa",
      "north korea": "korea polnocna",
      uae: "zjednoczone emiraty arabskie",
      palestine: "palestyna",
      vatican: "watykan",
      "ivory coast": "wybrzeze kosci sloniowej",
      myanmar: "mjanma",
      "timor leste": "timor wschodni",
      swaziland: "eswatini",
      russia: "rosja",
      moldova: "moldawia",
      "north macedonia": "macedonia polnocna"
    };

    function normalizeAnswer(answer) {
      const cleaned = normalize(answer);
      return aliases[cleaned] || cleaned;
    }

    // 🌍 Kraje
    const easyCountries = { "polska":"pl","niemcy":"de","francja":"fr","wlochy":"it","wielka brytania":"gb","stany zjednoczone":"us" };
    const mediumCountries = { "bialorus":"by","gruzja":"ge","moldawia":"md","bosnia i hercegowina":"ba" };
    const hardCountries = { "andora":"ad","monako":"mc","san marino":"sm","liechtenstein":"li" };

    const difficultySets = { easy: easyCountries, medium: mediumCountries, hard: hardCountries };

    function getWeightedLevel() {
      const r = Math.random();
      if (r < 0.6) return "easy";
      if (r < 0.88) return "medium";
      return "hard";
    }

    function randomCountry(level) {
      if (!["easy","medium","hard"].includes(level)) level = getWeightedLevel();
      const entries = Object.entries(difficultySets[level]);
      const [name, code] = entries[Math.floor(Math.random() * entries.length)];
      return { name, code, difficulty: level };
    }

    function getFlagEmoji(code) {
      return code
        ? code
            .toUpperCase()
            .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
        : "🏳️";
    }

    const level = args[0]?.toLowerCase();
    if (level && !["easy","medium","hard"].includes(level))
      return output.reply("❌ Nieprawidłowy poziom!\nUżycie: zgadnij [easy|medium|hard]");

    const { name, code } = randomCountry(level);

    const msg = `🧩 Zgadnij kraj! ${getFlagEmoji(code)}\nMasz 30 sekund na odpowiedź.`;
    const sent = await output.reply(msg);

    // Obsługa odpowiedzi
    const start = Date.now();
    const timeout = 30000;

    const handleReply = async (rep) => {
      const userAns = normalizeAnswer(rep.body);
      if (userAns === normalizeAnswer(name)) {
        rep.output.reply(`✅ Brawo ${rep.input.senderName || "Użytkownik"}! Poprawna odpowiedź: ${getFlagEmoji(code)} ${name}`);
        return true; // zakończ
      } else {
        rep.output.react("❌");
        return false; // dalej czeka
      }
    };

    const listener = ctx.output.onReply(handleReply);

    setTimeout(() => {
      listener.off(); // usuwa listener
      output.reply(`⏰ Czas minął!\n✅ Poprawna odpowiedź: ${getFlagEmoji(code)} ${name}`);
    }, timeout);
  }
});
