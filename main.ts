import { App, Plugin, PluginSettingTab, Setting, Modal } from 'obsidian';
import { DateTime, Duration, Interval } from 'luxon';
import * as ProgressBar from 'progressbar.js';

interface CountdownToSettings {
  defaultBarColor: string;
  defaultTrailColor: string;
  defaultBarType: string;
  defaultProgressType: string;
  defaultOnCompleteText: string;
  defaultInfoFormat: string;
  defaultUpdateInRealTime: boolean;
  defaultUpdateIntervalSeconds: number;
}

const DEFAULT_SETTINGS: CountdownToSettings = {
  defaultBarColor: '#4CAF50',
  defaultTrailColor: '#e0e0e0',
  defaultBarType: 'Line',
  defaultProgressType: 'Forward',
  defaultOnCompleteText: '{title} is done!',
  defaultInfoFormat: '{percent}% - {remaining} remaining',
  defaultUpdateInRealTime: false,
  defaultUpdateIntervalSeconds: 1,
};

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

class LuxonFormatHelpModal extends Modal {
  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Info Format Help' });

    contentEl.createEl('h3', { text: 'Placeholders' });
    const placeholdersList = contentEl.createEl('ul');
    placeholdersList.createEl('li', { text: '{percent} - Percentage of completion' });
    placeholdersList.createEl('li', { text: '{start} - Start date (ISO format)' });
    placeholdersList.createEl('li', { text: '{end} - End date (ISO format)' });
    placeholdersList.createEl('li', { text: '{current} - Current date (ISO format)' });
    placeholdersList.createEl('li', { text: '{remaining} - Remaining time' });
    placeholdersList.createEl('li', { text: '{elapsed} - Elapsed time' });
    placeholdersList.createEl('li', { text: '{total} - Total duration' });

    contentEl.createEl('h3', { text: 'Formatting' });
    contentEl.createEl('p', { text: 'You can use Luxon formatting for dates:' });
    const luxonList = contentEl.createEl('ul');
    luxonList.createEl('li', { text: '{start(format)} - Format start date' });
    luxonList.createEl('li', { text: '{end(format)} - Format end date' });
    luxonList.createEl('li', { text: '{current(format)} - Format current date' });
    contentEl.createEl('a', { href: 'https://moment.github.io/luxon/#/formatting?id=table-of-tokens', text: 'Luxon Formatting Reference' });

    contentEl.createEl('p', { text: 'For durations the only tokens that are supported are for days, hours, minutes and seconds:' });
    luxonList.createEl('li', { text: '{remaining:format} - Format remaining time' });
    luxonList.createEl('li', { text: '{elapsed:format} - Format elapsed time' });
    luxonList.createEl('li', { text: '{total:format} - Format total duration' });

    contentEl.createEl('h3', { text: 'Examples' });
    const examplesList = contentEl.createEl('ul');
    examplesList.createEl('li', { text: '{percent}% complete - {remaining} left' });
    examplesList.createEl('li', { text: 'Started on {start:LLL d}, ends on {end:LLL d, yyyy}' });
    examplesList.createEl('li', { text: '{elapsed} elapsed out of {total} total' });

    contentEl.createEl('h3', { text: 'Common Luxon Formats' });
    const formatsTable = contentEl.createEl('table');
    const headerRow = formatsTable.createEl('tr');
    headerRow.createEl('th', { text: 'Format' });
    headerRow.createEl('th', { text: 'Output' });

    const addFormatRow = (format: string, output: string) => {
      const row = formatsTable.createEl('tr');
      row.createEl('td', { text: format });
      row.createEl('td', { text: output });
    };

    addFormatRow('yyyy-MM-dd', '2025-04-11');
    addFormatRow('LLL d, yyyy', 'Apr 11, 2025');
    addFormatRow('EEEE, MMMM d, yyyy', 'Thursday, April 11, 2025');
    addFormatRow('d MMMM yyyy', '11 April 2025');
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class CountdownToSettingTab extends PluginSettingTab {
  plugin: CountdownToPlugin;

  constructor(app: App, plugin: CountdownToPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Countdown To Settings' });

    new Setting(containerEl).setName('Bar types').setHeading();
    new Setting(containerEl)
      .setName('Default bar type')
      .setDesc('Default type of progress bar to display')
      .addDropdown(dropdown => dropdown
        .addOption('Line', 'Line')
        .addOption('Circle', 'Circle')
        .addOption('SemiCircle', 'Semi Circle')
        .addOption('Square', 'Square')
        .setValue(this.plugin.settings.defaultBarType)
        .onChange(async (value) => {
          this.plugin.settings.defaultBarType = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default progress type')
      .setDesc('Count as progress or as a countdown')
      .addDropdown(dropdown => dropdown
        .addOption('Progress', 'Progress')
        .addOption('Countdown', 'Countdown')
        .setValue(this.plugin.settings.defaultProgressType)
        .onChange(async (value) => {
          this.plugin.settings.defaultProgressType = value;
          await this.plugin.saveSettings();
        }));

      new Setting(containerEl).setName('Real time update').setHeading();
      new Setting(containerEl)
        .setName('Update in real-time')
        .setDesc('Update progress bars according to the update interval')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.defaultUpdateInRealTime)
          .onChange(async (value) => {
            this.plugin.settings.defaultUpdateInRealTime = value;
            await this.plugin.saveSettings();
            this.display();
          }));

    if (this.plugin.settings.defaultUpdateInRealTime) {
      new Setting(containerEl)
        .setName('Update interval')
        .setDesc('How often to update the progress bars (in seconds). This will affect performance.')
        .addSlider(slider => slider
          .setLimits(0.5, 20, 0.5)
          .setValue(this.plugin.settings.defaultUpdateIntervalSeconds)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.defaultUpdateIntervalSeconds = value;
            await this.plugin.saveSettings();
          }));
    }

    new Setting(containerEl).setName('Text').setHeading();
    new Setting(containerEl)
      .setName('Default info format')
      .setDesc('Default format for the info text. Uses Luxon formatting (See format help button for a quick reference).')
      .addTextArea(text => text
        .setPlaceholder('{percent}% - {remaining} remaining')
        .setValue(this.plugin.settings.defaultInfoFormat)
        .onChange(async (value) => {
          this.plugin.settings.defaultInfoFormat = value;
          await this.plugin.saveSettings();
        }))
      .addExtraButton(button => {
        button
          .setIcon('help')
          .setTooltip('Show format help')
          .onClick(() => {
            new LuxonFormatHelpModal(this.plugin.app).open();
          });
    });

    new Setting(containerEl)
      .setName('Default on complete text')
      .setDesc('Default text to display when the progress is complete. Use {title} to display the title of the progress bar.')
      .addText(text => text
        .setPlaceholder('{title} is done!')
        .setValue(this.plugin.settings.defaultOnCompleteText)
        .onChange(async (value) => {
          this.plugin.settings.defaultOnCompleteText = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName('Colors').setHeading();
    new Setting(containerEl)
      .setName('Default bar color')
      .setDesc('Default color for the progress bar')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.defaultBarColor)
        .onChange(async (value) => {
          this.plugin.settings.defaultBarColor = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default trail color')
      .setDesc('Default trail color for the progress bar (the incomplete part)')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.defaultTrailColor)
        .onChange(async (value) => {
          this.plugin.settings.defaultTrailColor = value;
          await this.plugin.saveSettings();
        }));
    containerEl.createEl('br');
    containerEl.createEl('i', { text: 'All settings can be overridden in the markdown code block. If stuck please refer to the ' });
    containerEl.createEl('a', { href: 'https://github.com/guicattani/countdown-to?tab=readme-ov-file#how-to-use', text: 'how to use guide' });
  }
}

export default class CountdownToPlugin extends Plugin {
  settings: CountdownToSettings;

  countdownTos = new Map<string, CountdownToInstace>();

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor('countdown-to', (source, el) => {
      const id = Math.random().toString(36).substring(2, 15);
      this.renderCountdownTo(source, el, id);
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
    this.refreshAllCountdownTos();
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

  refreshAllCountdownTos() {
    this.countdownTos.forEach((data, id) => {
      if (data.updateTimer) {
        window.clearTimeout(data.updateTimer);
        data.updateTimer = null;
      }

      this.renderCountdownTo(data.params, data.element, id);
    });
  }

  renderCountdownTo(source: string, el: HTMLElement, id: string) {
    try {
      this.cleanupCountdownTo(id);

      const params = this.parseCountdownToParams(source);

      el.empty();
      const containerEl = el.createDiv({ cls: ['countdown-to-plugin', 'countdown-to-container'] });

      const startDate = DateTime.fromISO(params.startDate);
      const endDate = DateTime.fromISO(params.endDate);

      if (!startDate.isValid) {
        containerEl.setText('Invalid start date format. ' +
                            'Please use ISO + time format (YYYY-MM-DDTHH:MM:SS).');
        return;
      }

      if (!endDate.isValid) {
        containerEl.setText('Invalid end date format. ' +
                            'Please use ISO + time format (YYYY-MM-DDTHH:MM:SS).');
        return;
      }

      if (endDate < startDate) {
        containerEl.setText('End date must be after start date.');
        return;
      }

      const countdownToEl = containerEl.createDiv({ cls: 'countdown-to-element' });
      const barType = params.type || this.settings.defaultBarType;
      countdownToEl.addClass(`countdown-to-${barType.toLowerCase()}`);

      const infoEl = containerEl.createDiv({ cls: 'countdown-to-info' });

      let bar;
      const barColor = params.color || this.settings.defaultBarColor;
      const trailColor = params.trailColor || this.settings.defaultTrailColor;
      const commonOptions = {
        strokeWidth: 4,
        color: barColor,
        trailColor: trailColor,
        trailWidth: 1,
      };

      switch (barType.toLowerCase()) {
        case 'circle':
          bar = new ProgressBar.Circle(countdownToEl, {
            ...commonOptions,
            svgStyle: { width: '100%', height: '100%' },
          });
          break;
        case 'semicircle':
          bar = new ProgressBar.SemiCircle(countdownToEl, {
            ...commonOptions,
            svgStyle: { width: '100%', height: '100%' },
          });
          break;
        case 'square':
          bar = new ProgressBar.Square(countdownToEl, {
            ...commonOptions,
            svgStyle: { width: '100%', height: '100%' },
          });
          break;
        case 'line':
        default:
          bar = new ProgressBar.Line(countdownToEl, {
            ...commonOptions,
            svgStyle: { width: '100%', height: '100%' },
          });
          break;
      }

      if (params.title) {
        const titleEl = containerEl.createDiv({ cls: 'countdown-to-title' });
        titleEl.setText(params.title);
        containerEl.prepend(titleEl);
      }

      this.countdownTos.set(id, {
        element: el,
        bar: bar,
        infoEl: infoEl,
        params: source,
        updateTimer: null,
      });

      this.updateCountdownTo(id, startDate, endDate);

      const updateInRealTime = params.updateInRealTime !== undefined ?
        params.updateInRealTime === 'true' :
        this.settings.defaultUpdateInRealTime;

      if (updateInRealTime) {
        const updateInterval = params.updateInterval ?
          parseInt(params.updateInterval, 10) :
          this.settings.defaultUpdateIntervalSeconds;

        const timer = window.setTimeout(() => {
          this.scheduleUpdate(id, startDate, endDate, updateInterval);
        }, updateInterval * 1000);

        const CountdownToInstace = this.countdownTos.get(id);
        if (CountdownToInstace) {
          CountdownToInstace.updateTimer = timer;
        }
      }

    } catch (error) {
      el.setText('Error rendering countdown to: ' + error.message);
    }
  }

  scheduleUpdate(id: string, startDate: DateTime, endDate: DateTime, defaultUpdateIntervalSeconds: number) {
    const countdownTo = this.countdownTos.get(id);
    if (!countdownTo) return;

    this.updateCountdownTo(id, startDate, endDate);

    const timer = window.setTimeout(() => {
      this.scheduleUpdate(id, startDate, endDate, defaultUpdateIntervalSeconds);
    }, defaultUpdateIntervalSeconds * 1000);

    countdownTo.updateTimer = timer;
  }

  updateCountdownTo(id: string, startDate: DateTime, endDate: DateTime) {
    const countdownTo = this.countdownTos.get(id);
    if (!countdownTo) return;

    const params = this.parseCountdownToParams(countdownTo.params);
    const currentDate = DateTime.now();

    const totalInterval = Interval.fromDateTimes(startDate, endDate);
    const elapsedInterval = Interval.fromDateTimes(startDate, currentDate);

    const totalMillis = totalInterval.length();
    const elapsedMillis = Math.min(elapsedInterval.length(), totalMillis);

    const progress = Math.min(Math.max(elapsedMillis / totalMillis, 0), 1);
    const progressType = params.progressType || this.settings.defaultProgressType;
    const onCompleteText = params.onCompleteText || this.settings.defaultOnCompleteText;
    const infoFormat = params.infoFormat || this.settings.defaultInfoFormat;

    if (progressType.toLowerCase() === 'countdown') {
      countdownTo.bar.set(1.0 - progress);
    } else {
      countdownTo.bar.set(Math.floor(progress * 100) / 100);
    }

    if (progress >= 1) {
      countdownTo.infoEl.setText(
        onCompleteText.replace(/{title}/g, params.title || ''),
      );
    } else {
      let infoText = infoFormat;

      const remainingInterval = Interval.fromDateTimes(currentDate, endDate);
      const remainingDuration = remainingInterval.toDuration(['days', 'hours', 'minutes', 'seconds']);

      const elapsedDuration = elapsedInterval.toDuration(['days', 'hours', 'minutes', 'seconds']);

      const totalDuration = totalInterval.toDuration(['days', 'hours', 'minutes', 'seconds']);
      infoText = infoText
        .replace(/{start:(.*?)}/g, (_match: string, format: string) => startDate.toFormat(format))
        .replace(/{end:(.*?)}/g, (_match: string, format: string) => endDate.toFormat(format))
        .replace(/{current:(.*?)}/g, (_match: string, format: string) => currentDate.toFormat(format))
        .replace(/{remaining:(.*?)}/g, (_match: string, format: string) => remainingDuration.toFormat(format))
        .replace(/{elapsed:(.*?)}/g, (_match: string, format: string) => elapsedDuration.toFormat(format))
        .replace(/{total:(.*?)}/g, (_match: string, format: string) => totalDuration.toFormat(format));

      infoText = infoText
        .replace(/{percent}/g, Math.floor(progress * 100).toString())
        .replace(/{start}/g, startDate.toISODate() || '')
        .replace(/{end}/g, endDate.toISODate() || '')
        .replace(/{current}/g, currentDate.toISODate() || '')
        .replace(/{remaining}/g, this.formatDuration(remainingDuration))
        .replace(/{elapsed}/g, this.formatDuration(elapsedDuration))
        .replace(/{total}/g, this.formatDuration(totalDuration));

      countdownTo.infoEl.setText(infoText);
    }
  }

  parseCountdownToParams(source: string): Record<string, string> {
    const params: Record<string, string> = {};
    const lines = source.trim().split('\n');

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) {
          params[key] = value;
        }
      }
    });

    if (!params.startDate) {
      throw new Error('Start date is required');
    }

    if (DateTime.fromISO(params.startDate) > DateTime.now()) {
      throw new Error('Start date must be now or in the past');
    }

    if (!params.endDate) {
      throw new Error('End date is required');
    }

    return params;
  }

  formatDuration(duration: Duration): string {
    const days = Math.ceil(duration.as('days'));
    const hours = Math.ceil(duration.as('hours') % 24);
    const minutes = Math.ceil(duration.as('minutes') % 60);
    const seconds = Math.ceil(duration.as('seconds') % 60);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }
}
