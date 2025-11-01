import { SpectralCMDHome, CassCheckly, Config } from "@cassidy/spectral-home";
import { defineEntry } from "@cass/define";
import { FontSystem } from "cassidy-styler";
import { UNIRedux } from "@cassidy/unispectra";
import { CanvCass } from "@cassidy/canvcore";
import fs from "fs-extra";
import path from "path";

export const meta = {
  name: "help",
  description: "📘 Lista komend w stylu VelaBota (graficzna)",
  version: "1.0.0",
  category: "System",
  author: "@hugo",
  icon: "💫",
  cmdType: "cplx_g",
  noRibbonUI: true,
};

const configs = [
  {
    key: "home",
    description: "Pokazuje graficzną listę komend.",
    icon: "📘",
    async handler({ input, output, prefix }) {
      const cmdsDir = path.join(process.cwd(), "commands");
      const files = fs.readdirSync(cmdsDir).filter(f => f.endsWith(".js"));
      const commands = [];

      for (const file of files) {
        try {
          const mod = await import(`../${file}`);
          const data = mod.meta || mod.default?.meta || {};
          if (data.name && data.description) {
            commands.push({
              name: data.name,
              desc: data.description,
              category: data.category || "Inne",
            });
          }
        } catch {}
      }

      // Sortowanie i stronicowanie
      commands.sort((a, b) => a.name.localeCompare(b.name));
      const perPage = 10;
      const page = 1;
      const cmdsPage = commands.slice(0, perPage);

      // Tworzenie canvasa Cassieah-style
      const canv = CanvCass.premade({ width: 1000, height: 1300 });
      await canv.drawBackground("https://i.imgur.com/0sZsWZ9.png"); // kosmiczne tło

      canv.drawBox({
        rect: {
          left: 50,
          top: 100,
          width: canv.width - 100,
          height: canv.height - 200,
        },
        fill: "rgba(0,0,0,0.4)",
        radius: 30,
      });

      canv.drawText("📘 LISTA KOMEND", {
        x: canv.centerX,
        y: 160,
        align: "center",
        fill: "#00ccff",
        fontType: "cbold",
        size: 70,
        shadowColor: "#00ccff",
        shadowBlur: 20,
      });

      let y = 300;
      for (const cmd of cmdsPage) {
        canv.drawText(`/${cmd.name}`, {
          x: 150,
          y,
          align: "left",
          fill: "#00ccff",
          fontType: "cbold",
          size: 45,
        });
        canv.drawText(`- ${cmd.desc}`, {
          x: 400,
          y,
          align: "left",
          fill: "#ffffff",
          fontType: "cbold",
          size: 38,
        });
        y += 80;
      }

      canv.drawText("MADE WITH ❤️ BY hugo", {
        x: canv.centerX,
        y: canv.bottom - 60,
        align: "center",
        fill: "rgba(255,255,255,0.5)",
        fontType: "cbold",
        size: 28,
      });

      return output.reply({
        body: `${UNIRedux.arrow} Lista komend VelaBot w systemie Cassieah\n`,
        attachment: await canv.toStream(),
      });
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    defaultKey: "home",
    errorHandler: (error, ctx) => {
      ctx.output.error(error);
    },
  },
  configs
);

export const entry = defineEntry(async (ctx) => home.runInContext(ctx));