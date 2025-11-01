const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = easyCMD({
  name: "zgadnij",
  description: "🧩 Zgadnij kraj po fladze! (zgadnij [easy|medium|hard])",
  title: "🧩 Zgadnij kraj",
  icon: "🧩",
  category: "Zabawa",
  cooldown: 5,

  async run(ctx) {
    return main(ctx);
  },
});

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

// 📚 Aliasowanie
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
  iran: "iran",
  palestine: "palestyna",
  vatican: "watykan",
  "ivory coast": "wybrzeze kosci sloniowej",
  myanmar: "mjanma",
  "cape verde": "zielony przyladek",
  "timor leste": "timor wschodni",
  swaziland: "eswatini",
  russia: "rosja",
  moldova: "moldawia",
  "north macedonia": "macedonia polnocna"
};

// 🇵🇱 Normalizacja odpowiedzi
function normalizeAnswer(answer) {
  const cleaned = normalize(answer);
  return aliases[cleaned] || cleaned;
}

// 🎯 Losowy poziom z wagami
function getWeightedLevel() {
  const r = Math.random();
  if (r < 0.6) return "easy";
  if (r < 0.88) return "medium";
  return "hard";
}

// 🏁 Emoji flag
function getFlagEmoji(code) {
  return code
    ? code
        .toUpperCase()
        .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    : "🏳️";
}

// 🌍 Zbiory krajów
const easyCountries = {
  "polska": "pl","niemcy": "de","francja": "fr","hiszpania": "es","wlochy": "it",
  "wielka brytania": "gb","stany zjednoczone": "us"
};
const mediumCountries = { "bialorus": "by","gruzja": "ge","moldawia": "md" };
const hardCountries = { "andora":"ad","monako":"mc","malta":"mt","watykan":"va" };

const difficultySets = { easy: easyCountries, medium: mediumCountries, hard: hardCountries };

// 🎲 Losowy kraj
function randomCountry(level) {
  if (!["easy","medium","hard"].includes(level)) level = getWeightedLevel();
  const entries = Object.entries(difficultySets[level]);
  const [name, code] = entries[Math.floor(Math.random() * entries.length)];
  return { name, code, difficulty: level };
}

// 📸 Pobranie flagi do lokalnego pliku
async function downloadFlag(code) {
  const url = `https://flagcdn.com/w320/${code}.png`;
  const tmpPath = path.join(__dirname, "..", "tmp_flag.png");
  const response = await axios.get(url, { responseType: "arraybuffer" });
  await fs.writeFile(tmpPath, response.data);
  return tmpPath;
}

// 🌟 Funkcja główna
async function main({ output, args, cancelCooldown }) {
  let level = args[0]?.toLowerCase();
  if (level && !["easy","medium","hard"].includes(level)) {
    cancelCooldown();
    return output.reply("❌ Nieprawidłowy poziom!\nUżycie: zgadnij [easy|medium|hard]");
  }

  const { name, code } = randomCountry(level);
  const correct = normalizeAnswer(name);

  let flagFile;
  try {
    flagFile = await downloadFlag(code);
  } catch {
    return output.reply("⚠️ Nie udało się pobrać flagi.");
  }

  // Wczytaj flagę do Buffer
  const buffer = await fs.readFile(flagFile);

  const msg = await output.reply({
    body: `🧩 Zgadnij kraj!\nMasz 30 sekund.\nEmoji podpowiedź: ${getFlagEmoji(code)}`,
    attachment: [
      {
        type: "image",
        name: `${code}.png`,
        data: buffer
      }
    ]
  });

  // Obsługa odpowiedzi
  if (msg.atReply) {
    msg.atReply(async (rep) => {
      const userAns = normalizeAnswer(rep.input.text);
      if (userAns === correct) {
        await output.reply(`✅ Brawo! Poprawna odpowiedź: ${getFlagEmoji(code)} ${correct}`, rep);
      } else {
        await output.reply(`❌ Niepoprawnie! Spróbuj ponownie.`, rep);
      }
    });
  }

  // Timeout 30s
  setTimeout(() => {
    output.reply(`⏰ Czas minął!\n✅ Poprawna odpowiedź: ${getFlagEmoji(code)} ${correct}`);
  }, 30000);
}