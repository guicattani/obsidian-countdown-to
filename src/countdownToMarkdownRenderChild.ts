import { MarkdownRenderChild } from "obsidian";
import CountdownToPlugin from "./main";

import { DateTime, Duration, Interval } from 'luxon';
import * as ProgressBar from 'progressbar.js';

export class CountdownToMarkdownRenderChild extends MarkdownRenderChild {
  plugin: CountdownToPlugin;
  source: string;
  id: string;
  constructor(
    plugin: CountdownToPlugin,
    source: string,
    containerEl: HTMLElement,
    id: string
  ) {
    super(containerEl);
    this.plugin = plugin;
    this.id = id;
    this.source = source;
    this.display();
  }

  onload() {
    this.registerEvent(
      this.plugin.app.workspace.on(
        "countdown-to:rerender",
        this.display.bind(this)
      )
    );
  }

  display() {
    try {
      const params = this.parseCountdownToParams(this.source);

      this.containerEl.empty();
      const containerEl = this.containerEl.createDiv({ cls: ['countdown-to-plugin', 'countdown-to-container'] });

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
      const barType = params.type || this.plugin.settings.defaultBarType;
      countdownToEl.addClass(`countdown-to-${barType.toLowerCase()}`);

      const infoEl = containerEl.createDiv({ cls: 'countdown-to-info' });

      let bar;
      const barColor = params.color || this.plugin.settings.defaultBarColor;
      const trailColor = params.trailColor || this.plugin.settings.defaultTrailColor;
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

      this.plugin.countdownTos.set(this.id, {
        element: this.containerEl,
        bar: bar,
        infoEl: infoEl,
        params: this.source,
        updateTimer: null,
      });

      this.updateCountdownTo(this.id, startDate, endDate);

      const updateInRealTime = params.updateInRealTime !== undefined ?
        params.updateInRealTime === 'true' :
        this.plugin.settings.defaultUpdateInRealTime;

      if (updateInRealTime) {
        const updateInterval = params.updateInterval ?
          parseInt(params.updateInterval, 10) :
          this.plugin.settings.defaultUpdateIntervalSeconds;

        const timer = window.setTimeout(() => {
          this.scheduleUpdate(this.id, startDate, endDate, updateInterval);
        }, updateInterval * 1000);

        const CountdownToInstace = this.plugin.countdownTos.get(this.id);
        if (CountdownToInstace) {
          CountdownToInstace.updateTimer = timer;
        }
      }

    } catch (error) {
      this.containerEl.setText('Error rendering countdown to: ' + error.message);
    }
  }

  scheduleUpdate(id: string, startDate: DateTime, endDate: DateTime, defaultUpdateIntervalSeconds: number) {
    const countdownTo = this.plugin.countdownTos.get(id);
    if (!countdownTo) return;

    this.updateCountdownTo(id, startDate, endDate);

    const timer = window.setTimeout(() => {
      this.scheduleUpdate(id, startDate, endDate, defaultUpdateIntervalSeconds);
    }, defaultUpdateIntervalSeconds * 1000);

    countdownTo.updateTimer = timer;
  }

  updateCountdownTo(id: string, startDate: DateTime, endDate: DateTime) {
    const countdownTo = this.plugin.countdownTos.get(id);
    if (!countdownTo) return;

    const params = this.parseCountdownToParams(countdownTo.params);
    const currentDate = DateTime.now();

    const totalInterval = Interval.fromDateTimes(startDate, endDate);
    const elapsedInterval = Interval.fromDateTimes(startDate, currentDate);

    const totalMillis = totalInterval.length();
    const elapsedMillis = Math.min(elapsedInterval.length(), totalMillis);

    const progress = Math.min(Math.max(elapsedMillis / totalMillis, 0), 1);
    const progressType = params.progressType || this.plugin.settings.defaultProgressType;
    const onCompleteText = params.onCompleteText || this.plugin.settings.defaultOnCompleteText;
    const infoFormat = params.infoFormat || this.plugin.settings.defaultInfoFormat;

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
