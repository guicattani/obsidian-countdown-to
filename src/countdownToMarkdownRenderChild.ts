import { MarkdownRenderChild, MarkdownPostProcessorContext, TFile } from "obsidian";
import CountdownToPlugin from "./main";

import { DateTime, Duration, Interval } from 'luxon';
import * as ProgressBar from 'progressbar.js';

export class CountdownToMarkdownRenderChild extends MarkdownRenderChild {
  plugin: CountdownToPlugin;
  source: string;
  id: string;
  context: MarkdownPostProcessorContext;
  constructor(
    plugin: CountdownToPlugin,
    source: string,
    containerEl: HTMLElement,
    id: string,
    context: MarkdownPostProcessorContext
  ) {
    super(containerEl);
    this.plugin = plugin;
    this.id = id;
    this.source = source;
    this.context = context;
    this.display();
  }

  onload() {
    this.registerEvent(
      this.plugin.app.workspace.on(
        "countdown-to:rerender",
        this.display.bind(this)
      )
    );

    this.register(() => {
      this.cleanupCountdownTo();
    });
  }

  cleanupCountdownTo() {
    const countdownTo = this.plugin.countdownTos.get(this.id);
    if (countdownTo && countdownTo.updateTimer) {
      window.clearInterval(countdownTo.updateTimer);
      this.plugin.countdownTos.delete(this.id);
    }
  }

  display() {
    try {
      const params = this.parseCountdownToParams(this.source);

      this.containerEl.empty();
      const containerEl = this.containerEl.createDiv({ cls: ['countdown-to-plugin', 'countdown-to-container'] });

      const startDate = this.constructDateTime(params.startDate, params.startTime, 'start');
      const endDate = this.constructDateTime(params.endDate, params.endTime, 'end');

      if (endDate < startDate) {
        containerEl.setText('End date/time must be after start date/time.');
        return;
      }

      // Apply upcoming background color if start date is in the future
      const isUpcoming = startDate > DateTime.now();
      if (isUpcoming) {
        containerEl.addClass('countdown-to-upcoming');

        document.documentElement.style.setProperty(
          '--countdown-to-upcoming-bg',
          this.plugin.settings.defaultUpcomingBackgroundColor
        );
      }

      const countdownToEl = containerEl.createDiv({ cls: 'countdown-to-element' });
      const barType = params.type || this.plugin.settings.defaultBarType;
      countdownToEl.addClass(`countdown-to-${barType.toLowerCase()}`);

      const infoEl = containerEl.createDiv({ cls: 'countdown-to-info' });

      let bar;
      const initialbarColor = params.color || this.plugin.settings.defaultBarColor;
      const isGradient = (params.colorInGradient || this.plugin.settings.defaultColorInGradient.toString()) === 'true';
      const progressType = params.progressType || this.plugin.settings.defaultProgressType;
      let barColor: string;
      if (isGradient) {
        const startColorParam = params.startColor || this.plugin.settings.defaultStartColor;
        const endColorParam = params.endColor || this.plugin.settings.defaultEndColor;
        const isCountdown = progressType.toLowerCase() === 'countdown';
        barColor = isCountdown ? endColorParam : startColorParam;
      } else {
        barColor = initialbarColor;
      }
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
        const titleLines = params.title.split('\\n');
        titleLines.forEach(line => {
          const lineEl = titleEl.createDiv({ cls: 'countdown-to-title-line' });
          lineEl.setText(line);
        });

        containerEl.prepend(titleEl);
      }

      this.plugin.countdownTos.set(this.id, {
        element: this.containerEl,
        bar: bar,
        infoEl: infoEl,
        params: this.source,
        updateTimer: null,
        startedAsUpcoming: isUpcoming,
      });

      if (startDate > DateTime.now()) {
        this.updateCountdownTo(this.id, DateTime.now(), startDate, true);
      } else {
        this.updateCountdownTo(this.id, startDate, endDate, false);
      }


      const updateInRealTime = params.updateInRealTime !== undefined ?
        params.updateInRealTime === 'true' :
        this.plugin.settings.defaultUpdateInRealTime;

      if (updateInRealTime) {
        if (params.updateInterval && !params.updateIntervalInSeconds) {
          params.updateIntervalInSeconds = params.updateInterval;
        }

        const updateIntervalInSeconds = params.updateIntervalInSeconds ?
          parseInt(params.updateIntervalInSeconds, 10) :
          this.plugin.settings.defaultUpdateIntervalSeconds;
        this.scheduleUpdate(this.id, startDate, endDate, updateIntervalInSeconds);
      }

    } catch (error) {
      this.containerEl.empty();
      const containerEl = this.containerEl.createDiv({ cls: ['countdown-to-plugin', 'countdown-to-container'] });
      containerEl.setText('Error rendering countdown to: ' + error.message);
    }
  }

  scheduleUpdate(id: string, startDate: DateTime, endDate: DateTime, defaultUpdateIntervalSeconds: number) {
    const countdownTo = this.plugin.countdownTos.get(id);
    if (!countdownTo) return;

    const timer = window.setInterval(() => {
      if (startDate > DateTime.now()) {
        this.updateCountdownTo(this.id, DateTime.now(), startDate, true);
      } else {
        this.updateCountdownTo(this.id, startDate, endDate, false);
      }
    }, defaultUpdateIntervalSeconds * 1000);

    countdownTo.updateTimer = timer;
  }

  updateCountdownTo(id: string, startDate: DateTime, endDate: DateTime, upcoming: boolean = false) {
    const countdownTo = this.plugin.countdownTos.get(id);
    if (!countdownTo) return;

    const params = this.parseCountdownToParams(countdownTo.params);
    const currentDate = DateTime.now();

    if (countdownTo.startedAsUpcoming) {
      if (!upcoming) {
        const containerEl = countdownTo.element.querySelector('.countdown-to-container') as HTMLElement;
        containerEl.removeClass('countdown-to-upcoming');
      }
    }

    const totalInterval = Interval.fromDateTimes(startDate, endDate);
    const elapsedInterval = Interval.fromDateTimes(startDate, currentDate);

    const totalMillis = totalInterval.length();
    const elapsedMillis = Math.min(elapsedInterval.length(), totalMillis);

    const progress = Math.min(Math.max(elapsedMillis / totalMillis, 0), 1);
    const progressType = params.progressType || this.plugin.settings.defaultProgressType;
    const onCompleteText = params.onCompleteText || this.plugin.settings.defaultOnCompleteText;
    const infoFormat = params.infoFormat || this.plugin.settings.defaultInfoFormat;
    const infoFormatUpcoming = params.infoFormatUpcoming || this.plugin.settings.defaultInfoFormatUpcoming;

    if (progressType.toLowerCase() === 'countdown') {
      countdownTo.bar.set(1.0 - progress);
    } else {
      countdownTo.bar.set(Math.floor(progress * 100) / 100);
    }
    
    this.updateBarGradient(countdownTo, progress, params, progressType);

    if (progress >= 1) {
      countdownTo.infoEl.setText(
        onCompleteText.replace(/{title}/g, params.title || ''),
      );
    } else {
      let infoText;

      if (upcoming) {
        infoText = infoFormatUpcoming;
      } else {
        infoText = infoFormat;
      }

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
        .replace(/{title}/g, params.title || '');

      if (infoText.includes('{remaining}')) {
        infoText = infoText.replace(/{remaining}/g, this.formatDuration(remainingDuration))
      }
      if (infoText.includes('{elapsed}')) {
        infoText = infoText.replace(/{elapsed}/g, this.formatDuration(elapsedDuration))
      }
      if (infoText.includes('{total}')) {
        infoText = infoText.replace(/{total}/g, this.formatDuration(totalDuration))
      }

      countdownTo.infoEl.empty();
      const infoLines = infoText.split('\\n');
      infoLines.forEach(line => {
        const lineEl = countdownTo.infoEl.createDiv({ cls: 'countdown-to-info-line' });
        lineEl.setText(line);
      });
    }
  }

  private updateBarGradient(
    countdownTo: any,
    progress: number,
    params: Record<string, string>,
    progressType: string
  ): void {
    const isGradient =
      (params.colorInGradient || this.plugin.settings.defaultColorInGradient?.toString()) === "true";
    if (!isGradient || !countdownTo?.bar) return;
    const isCountdown = progressType.toLowerCase() === "countdown";

    const startColor = params.startColor || this.plugin.settings.defaultStartColor;
    const endColor = params.endColor || this.plugin.settings.defaultEndColor;
    const midColorParam = params.midColor || this.plugin.settings.defaultMidColor;
    const midColor = this.parseHexColor(midColorParam);

    let colorProgress: number;
    if (isCountdown) {
        colorProgress = 1.0 - progress; 
    } else {
        colorProgress = Math.floor(progress * 100) / 100;
    }

    let newColor: string;
    if (midColor) {
      if (colorProgress < 0.5) {
        newColor = this.interpolateColor(startColor, midColorParam, colorProgress * 2);
      } else {
        newColor = this.interpolateColor(midColorParam, endColor, (colorProgress - 0.5) * 2);
      }
    } else {
      newColor = this.interpolateColor(startColor, endColor, colorProgress);
    }

    const barPath = (countdownTo.bar as any)?.path as SVGPathElement;
    if (barPath) barPath.setAttribute("stroke", newColor);
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.parseHexColor(color1);
    const c2 = this.parseHexColor(color2);
    if (!c1 || !c2) return color1;
    const result = c1.map((v, i) => Math.round(v + factor * (c2[i] - v)));
    return `#${result.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }

  private parseHexColor(hex: string): number[] | null {
    if (!hex) return null; 
    const match = hex.trim().replace("#", "").match(/^([0-9a-f]{6})$/i);
    if (!match) return null;
    const intVal = parseInt(match[1], 16);
    return [(intVal >> 16) & 255, (intVal >> 8) & 255, intVal & 255];
  }  

  getPropertiesFromFrontmatter(): Record<string, string> {
    const properties: Record<string, string> = {};

    if (!this.context.sourcePath) {
      return properties;
    }

    const file = this.plugin.app.vault.getAbstractFileByPath(this.context.sourcePath);
    if (!file || !(file instanceof TFile)) {
      return properties;
    }

    const fileCache = this.plugin.app.metadataCache.getFileCache(file);
    if (!fileCache || !fileCache.frontmatter) {
      return properties;
    }

    const frontmatter = fileCache.frontmatter;

    const propertyMapping = [
      'startDate',
      'startTime',
      'endDate',
      'endTime',
      'title',
      'color',
      'trailColor',
      'type',
      'progressType',
      'updateInRealTime',
      'updateInterval',
      'updateIntervalInSeconds',
      'infoFormat',
      'infoFormatUpcoming',
      'onCompleteText',
      'colorInGradient',
      'startColor',
      'endColor',
      'midColor'
    ];

    propertyMapping.forEach(prop => {
      const prefixedKey = `countdown-${prop}`;
      if (frontmatter[prefixedKey] !== undefined) {
        properties[prop] = String(frontmatter[prefixedKey]);
      }
    });

    return properties;
  }

  parseCountdownToParams(source: string): Record<string, string> {
    // Start with properties from frontmatter (obsidian metadata) and override with code block parameters
    const params: Record<string, string> = this.getPropertiesFromFrontmatter();

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

    if (!params.startDate && !params.startTime) {
      throw new Error('Start date or start time is required');
    }

    if (!params.endDate && !params.endTime) {
      throw new Error('End date or end time is required');
    }

    if (params.startTime && !params.startDate && params.endDate && !params.endTime ||
        params.startTime && !params.startDate && params.endDate && params.endTime) {
      throw new Error('Start time with no start date requires an end time with no end date');
    }

    if (params.startDate === params.endDate && params.startTime === params.endTime) {
      throw new Error('Start date and end date cannot be the same');
    }


    return params;
  }

  formatDuration(duration: Duration): string {
    const days = Math.floor(duration.as('days'));
    const hours = Math.floor(duration.as('hours') % 24);
    const minutes = Math.floor(duration.as('minutes') % 60);
    const seconds = Math.floor(duration.as('seconds') % 60);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ` +
             `${minutes} minute${minutes > 1 ? 's' : ''} ` +
             `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ` +
             `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }

  constructDateTime(date: string, time: string, type: string): DateTime {
    const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

    if (isoDateTimeRegex.test(date)) {
      const dateTime = DateTime.fromISO(date);
      return dateTime;
    }

    let dateToUse = date || DateTime.now().toFormat('yyyy-MM-dd');
    let timeToUse = time || '00:00:00';

    if (timeToUse && !timeToUse.includes(':')) {
      timeToUse = `${timeToUse}:00`;
    } else if (timeToUse && timeToUse.split(':').length === 2) {
      timeToUse = `${timeToUse}:00`;
    }

    const dateTimeString = `${dateToUse}T${timeToUse}`;
    const dateTime = DateTime.fromISO(dateTimeString);

    if (!dateTime.isValid) {
      throw new Error(`Invalid ${type} date or time format: ${dateTimeString}`);
    }

    return dateTime;
  }

}
