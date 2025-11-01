// zgadnij.js
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

export const meta = {
  name: "zgadnij",
  otherNames: ["flag","flagguess"],
  author: "ChatGPT + Hugo",
  version: "1.0.0",
  description: "🧩 Zgadnij kraj po fladze! (zgadnij [easy|medium|hard])",
  usage: "{prefix}{name} [easy|medium|hard]",
  category: "Zabawa",
  noPrefix: "both",
  permissions: [0],
  botAdmin: false,
  waitingTime: 5,
  ext_plugins: { output: "^1.0.0" },
  supported: "^4.0.0"
};

// pomocnicze funkcje (normalizacja / aliasy)
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
const aliases = { usa: "stany zjednoczone", uk: "wielka brytania", gb: "wielka brytania", england: "wielka brytania", drcongo: "demokratyczna republika konga", congo: "kongo", "south korea": "korea poludniowa", "north korea": "korea polnocna", uae: "zjednoczone emiraty arabskie", palestine: "palestyna", vatican: "watykan" };
function normalizeAnswer(answer) { const cleaned = normalize(answer); return aliases[cleaned] || cleaned; }
function getWeightedLevel() { const r = Math.random(); if (r < 0.6) return "easy"; if (r < 0.88) return "medium"; return "hard"; }
function flagEmoji(code) { return code ? code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0))) : "🏳️"; }

// zbiory (skrócone, rozszerz je według potrzeby)
const easyCountries = { polska: "pl", niemcy: "de", francja: "fr", hiszpania: "es", wlochy: "it", "wielka brytania": "gb", "stany zjednoczone": "us" };
const mediumCountries = { bialorus: "by", gruzja: "ge", moldawia: "md" };
const hardCountries = { andora: "ad", monako: "mc", malta: "mt", watykan: "va" };
const difficultySets = { easy: easyCountries, medium: mediumCountries, hard: hardCountries };
function randomCountry(level) { if (!["easy","medium","hard"].includes(level)) level = getWeightedLevel(); const entries = Object.entries(difficultySets[level]); const [name, code] = entries[Math.floor(Math.random() * entries.length)]; return { name, code, difficulty: level }; }

// pobierz flagę (arraybuffer -> zapis do pliku)
async function getFlagFile(countryCode) {
  const urls = [
    `https://flagcdn.com/w320/${countryCode}.png`,
    `https://flagcdn.com/h240/${countryCode}.png`,
    `https://countryflagsapi.com/png/${countryCode}`
  ];
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, `${countryCode}_${Date.now()}.png`);
  for (const url of urls) {
    try {
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 7000 });
      await fs.writeFile(filePath, r.data);
      return filePath;
    } catch (e) { /* fallback */ }
  }
  return null;
}

// entry (start gry)
export async function entry({ input, output, args, event }) {
  const threadID = event?.threadID;
  let level = args[0]?.toLowerCase();
  if (level && !["easy","medium","hard"].includes(level)) {
    return output.reply("❌ Nieprawidłowy poziom!\nUżycie: zgadnij [easy|medium|hard]");
  }

  const { name, code } = randomCountry(level);
  const correct = normalizeAnswer(name);
  const flagPath = await getFlagFile(code);
  if (!flagPath) return output.reply("⚠️ Nie udało się pobrać flagi.");

  // wyślij flagę jako załącznik i zapisz info do global.handleReply
  const sent = await output.reply({
    body: "🧩 Zgadnij kraj po fladze! Masz 30 sekund.",
    attachment: fs.createReadStream(flagPath)
  });

  // przygotuj handleReply storage
  if (!global.client) global.client = {};
  if (!global.client.handleReply) global.client.handleReply = [];

  global.client.handleReply.push({
    type: "guessFlag",
    name: meta.name,
    messageID: sent?.messageID || null,
    threadID,
    correct,
    code,
    timeoutAt: Date.now() + 30000
  });

  // ustaw timeout który po 30s ujawni poprawną odpowiedź (usuwa entry z handleReply)
  setTimeout(async () => {
    const idx = global.client.handleReply.findIndex(i => i.messageID === (sent && sent.messageID));
    if (idx !== -1) {
      global.client.handleReply.splice(idx, 1);
      try { if (output.unsend && sent && sent.messageID) await output.unsend(sent.messageID); } catch (e) {}
      await output.reply(`⏰ Czas minął!\n✅ Poprawna odpowiedź: ${flagEmoji(code)} ${name}`);
    }
    // usuwamy plik
    try { if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath); } catch (e) {}
  }, 30000);
}

// obsługa odpowiedzi (handleReply) — jeżeli Twój framework wywołuje taki handler, popraw nazwę
export async function handleReply({ input, output, event, handleReply }) {
  // some runtimes call this signature; support generic global.client.handleReply fallback
  const { body, senderID, threadID, messageID } = event;
  if (!body) return;
  // find matching stored game
  const store = (global.client && global.client.handleReply) || [];
  const idx = store.findIndex(h => h.type === "guessFlag" && h.threadID === threadID);
  if (idx === -1) return;

  const hr = store[idx];
  const userAns = normalizeAnswer(body);
  if (userAns === hr.correct) {
    // correct
    store.splice(idx, 1);
    try { if (output.unsend && hr.messageID) await output.unsend(hr.messageID); } catch (e) {}
    const info = (typeof output.getUserInfo === "function") ? await output.getUserInfo(senderID) : null;
    const name = info && info[senderID] && info[senderID].name ? info[senderID].name : "Użytkownik";
    await output.reply(`✅ Brawo ${name}! Poprawna odpowiedź: ${flagEmoji(hr.code)} ${hr.correct}`);
  } else {
    // wrong attempt -> reaction if available
    if (typeof output.react === "function") {
      try { await output.react(messageID, "❌"); } catch (e) {}
    } else {
      await output.reply("❌ Niepoprawnie! Spróbuj ponownie.");
    }
  }
}