import { Plugin } from 'obsidian';
import { CountdownToSettings, CountdownToSettingTab, DEFAULT_SETTINGS } from './settings';
import { CountdownToMarkdownRenderChild } from './countdownToMarkdownRenderChild';

// Minimal interface for progressbar.js instances
interface CountdownToJs {
  set(progress: number): void;
}

interface CountdownToInstace {
  element: HTMLElement;
  bar: CountdownToJs;
  infoEl: HTMLElement;
  params: string;
  updateTimer: number | null;
}

export default class CountdownToPlugin extends Plugin {
  settings: CountdownToSettings;
  countdownTos = new Map<string, CountdownToInstace>();

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor('countdown-to', (source, el, ctx) => {
      const id = Math.random().toString(36).substring(2, 15);

      ctx.addChild(new CountdownToMarkdownRenderChild(this, source, el, id));
    });

    this.addSettingTab(new CountdownToSettingTab(this.app, this));
    this.register(() => {
      this.cleanupAllCountdownTos();
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  cleanupCountdownTo(id: string) {
    const countdownTo = this.countdownTos.get(id);
    if (countdownTo && countdownTo.updateTimer) {
      window.clearTimeout(countdownTo.updateTimer);
      this.countdownTos.delete(id);
    }
  }

  cleanupAllCountdownTos() {
    this.countdownTos.forEach((data) => {
      if (data.updateTimer) {
        window.clearTimeout(data.updateTimer);
      }
    });
    this.countdownTos.clear();
  }
}
