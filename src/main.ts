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
      let id = '';
      while (this.countdownTos.has(id)) {
        id = Math.random().toString(36).substring(2, 15);
      }

      ctx.addChild(new CountdownToMarkdownRenderChild(this, source, el, id));
    });

    this.addSettingTab(new CountdownToSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
