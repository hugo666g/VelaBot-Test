// commands/zgadnij.js  (fca / ws3 compatible)
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "zgadnij",
  version: "1.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Hugo",
  description: "🧩 Zgadnij kraj po fladze! (zgadnij [easy|medium|hard])",
  commandCategory: "Zabawa",
  usages: "zgadnij [easy|medium|hard]",
  cooldowns: 5
};

// --- pomocnicze funkcje ---
function normalize(text = "") {
  return String(text || "")
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
  vatican: "watykan"
};

function normalizeAnswer(ans) {
  const cleaned = normalize(ans);
  return aliases[cleaned] || cleaned;
}

function flagEmoji(code) {
  return code
    ? code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    : "🏳️";
}

function getWeightedLevel() {
  const r = Math.random();
  if (r < 0.6) return "easy";
  if (r < 0.88) return "medium";
  return "hard";
}

// --- zbiory krajów (możesz rozszerzyć) ---
const easy = { polska: "pl", niemcy: "de", francja: "fr", hiszpania: "es", wlochy: "it", "wielka brytania": "gb", "stany zjednoczone": "us" };
const medium = { bialorus: "by", gruzja: "ge", moldawia: "md" };
const hard = { andora: "ad", monako: "mc", malta: "mt", watykan: "va" };
const difficultySets = { easy, medium, hard };

function randomCountry(level) {
  if (!["easy", "medium", "hard"].includes(level)) level = getWeightedLevel();
  const entries = Object.entries(difficultySets[level]);
  const [name, code] = entries[Math.floor(Math.random() * entries.length)];
  return { name, code, difficulty: level };
}

// --- pobranie flagi z fallbackem (zapis do pliku) ---
async function fetchFlagToFile(code) {
  const urls = [
    `https://flagcdn.com/w320/${code}.png`,
    `https://flagcdn.com/h240/${code}.png`,
    `https://countryflagsapi.com/png/${code}`
  ];
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, `${code}_${Date.now()}.png`);
  for (const url of urls) {
    try {
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 7000 });
      await fs.writeFile(filePath, r.data);
      return filePath;
    } catch (e) {
      // console.warn("flag fetch fail", url, e.message);
    }
  }
  return null;
}

// --- główna komenda ---
module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;
  try {
    let level = args[0] ? String(args[0]).toLowerCase() : undefined;
    if (level && !["easy", "medium", "hard"].includes(level)) {
      return api.sendMessage("❌ Nieprawidłowy poziom!\nUżycie: zgadnij [easy|medium|hard]", threadID, event.messageID);
    }

    const { name, code } = randomCountry(level);
    const correct = normalizeAnswer(name);

    const flagPath = await fetchFlagToFile(code);
    if (!flagPath) {
      return api.sendMessage("⚠️ Nie udało się pobrać flagi.", threadID, event.messageID);
    }

    // Wyślij flagę i zapisz ID wiadomości
    const sent = await api.sendMessage(
      {
        body: "🧩 Zgadnij kraj po fladze! Masz 30 sekund.",
        attachment: fs.createReadStream(flagPath)
      },
      threadID,
      (err, info) => {
        if (err) console.error("[zgadnij] sendMessage error:", err && err.message ? err.message : err);
      },
      event.messageID
    );

    // Upewnij się, że global.client.handleReply istnieje
    if (!global.client) global.client = {};
    if (!global.client.handleReply) global.client.handleReply = [];

    // Dodaj entry: zapisujemy messageID i threadID
    global.client.handleReply.push({
      type: "guessFlag",
      name: module.exports.config.name,
      messageID: sent.messageID,
      threadID,
      author: event.senderID,
      correct,
      code,
      flagPath,
      timestamp: Date.now()
    });

    // Timeout: po 30s pokaż prawidłową odpowiedź i usuń entry
    setTimeout(async () => {
      const idx = global.client.handleReply.findIndex(x => x.messageID === sent.messageID && x.threadID === threadID && x.type === "guessFlag");
      if (idx !== -1) {
        const entry = global.client.handleReply.splice(idx, 1)[0];
        try { await api.unsendMessage(entry.messageID); } catch (e) { /* ignore */ }
        await api.sendMessage(`⏰ Czas minął!\n✅ Poprawna odpowiedź: ${flagEmoji(entry.code)} ${entry.correct}`, threadID);
        // cleanup pliku
        try { if (fs.existsSync(entry.flagPath)) fs.unlinkSync(entry.flagPath); } catch (e) {}
      }
    }, 30000);

  } catch (err) {
    console.error("[zgadnij run error]", err);
    return api.sendMessage("❌ Wystąpił błąd podczas uruchamiania komendy.", event.threadID, event.messageID);
  }
};

// --- handleReply wywoływany przez system eventów (fca/ws3) ---
module.exports.handleReply = async function ({ api, event, handleReply }) {
  // Jeśli Twój framework wywołuje handleReply z tym parametrem, użyj tego
  const { body, senderID, threadID, messageID } = event;
  if (!body) return;
  if (!global.client) global.client = {};
  if (!global.client.handleReply) global.client.handleReply = [];

  // Znajdź entry, które odpowiada tej konwersacji i ID
  const idx = global.client.handleReply.findIndex(h => h.type === "guessFlag" && h.threadID === threadID && h.messageID === handleReply.messageID);
  // Fallback: jeśli nie ma handleReply argumentu (niektóre runtimes przekazują tylko event), dopasuj po threadID i author
  let entry;
  if (idx !== -1) {
    entry = global.client.handleReply[idx];
  } else {
    // fallback: szukaj aktywnej gry w tym wątku (ostatnia)
    entry = [...global.client.handleReply].reverse().find(h => h.type === "guessFlag" && h.threadID === threadID);
    if (entry) {
      // zaktualizuj idx
      const realIdx = global.client.handleReply.findIndex(x => x === entry);
      if (realIdx !== -1) idx = realIdx;
    } else {
      return; // brak pasującej gry
    }
  }

  // weryfikuj odpowiedź
  const userAns = normalizeAnswer(body);
  const correct = entry.correct;

  if (userAns === correct) {
    // poprawna: usuń entry i pochwal gracza
    const removed = global.client.handleReply.findIndex(h => h.messageID === entry.messageID && h.threadID === threadID);
    if (removed !== -1) global.client.handleReply.splice(removed, 1);

    // usuń oryginalne wyświetlenie flagi (jeśli chcesz)
    try { await api.unsendMessage(entry.messageID); } catch (e) { /* ignore */ }

    // pobierz info o użytkowniku (jeśli api.getUserInfo dostępne)
    let name = "Użytkownik";
    try {
      const info = await api.getUserInfo(senderID);
      if (info && info[senderID] && info[senderID].name) name = info[senderID].name;
    } catch {}

    await api.sendMessage(`✅ Brawo ${name}! Poprawna odpowiedź: ${flagEmoji(entry.code)} ${correct}`, threadID);
    // cleanup pliku
    try { if (fs.existsSync(entry.flagPath)) fs.unlinkSync(entry.flagPath); } catch (e) {}
  } else {
    // niepoprawna: zareaguj ❌ (jeśli działa) albo napisz krótką odpowiedź
    try {
      await api.setMessageReaction("❌", messageID, (err) => {}, true);
    } catch (e) {
      await api.sendMessage("❌ Niepoprawnie! Spróbuj jeszcze raz.", threadID, messageID);
    }
  }
};