import OutputClass, { NoEventCMDContext } from "./OutputClass";

export class BackgroundTaskFB {
  skips: number;
  currentSkips: number;

  constructor(
    skips: number,
    bgTask: BackgroundTaskFB["bgTask"],
    bgTaskCondition: BackgroundTaskFB["bgTaskCondition"] = async (_) => true
  ) {
    this.bgTask = bgTask;
    this.skips = Number(skips);
    this.currentSkips = 0;
    this.bgTaskCondition = bgTaskCondition;
  }

  bgTask: (ctx: NoEventCMDContext) => Promise<any>;
  bgTaskCondition: (ctx: NoEventCMDContext) => Promise<boolean>;

  static get tasks() {
    return Cassidy.bgTasks;
  }

  updateSkip() {
    this.currentSkips++;
    if (this.currentSkips > this.skips) {
      this.currentSkips = 0;
    }
  }

  willSkip() {
    return this.currentSkips > 0;
  }
}

export namespace BackgroundTaskFB {
  export function loadTasksFromCommands() {
    for (const cmd of Cassidy.multiCommands.values()) {
      const tasks = (Array.isArray(cmd.bgTasks) ? [...cmd.bgTasks] : []).filter(
        (t) => t instanceof BackgroundTaskFB
      );
      Cassidy.bgTasks.push(...tasks);
      if (tasks.length > 0) {
        logger(
          `${tasks.length} Background tasks loaded!`,
          `[${cmd.meta.name}]`
        );
      }
    }
  }

  export async function startPoll(api: CommandContext["api"]) {
    const handler = async () => {
      const output = OutputClass.createWithoutEvent(api);
      const ctx = output.getNoEventContext();
      for (const task of Cassidy.bgTasks) {
        try {
          task.updateSkip();
          output.clearStyle();
          const will = await task.bgTaskCondition(ctx);
          if (!will || task.willSkip()) {
            continue;
          }
          await task.bgTask(ctx);
        } catch (err) {
          console.error(err);
        }
      }
    };
    const id = setInterval(handler, 2 * 60 * 1000);
    logger(`${Cassidy.bgTasks.length} Background tasks started!`, "[Tasks]");
    return {
      handler,
      id,
      stop() {
        clearInterval(id);
      },
    };
  }
}
