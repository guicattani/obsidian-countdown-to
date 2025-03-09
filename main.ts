import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as ProgressBar from 'progressbar.js';

interface ProgressBarSettings {
	defaultBarColor: string;
	defaultBarBackgroundColor: string;
	defaultBarType: string;
  defaultProgressType: string;
  defaultOnCompleteText: string;
}

const DEFAULT_SETTINGS: ProgressBarSettings = {
	defaultBarColor: '#4CAF50',
	defaultBarBackgroundColor: '#e0e0e0',
	defaultBarType: 'Line',
  defaultProgressType: 'forward',
  defaultOnCompleteText: 'Completed!',
}

export default class ProgressBarPlugin extends Plugin {
	settings: ProgressBarSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor('progressbar', (source, el) => {
			this.renderProgressBar(source, el);
		});

		this.addSettingTab(new ProgressBarSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	renderProgressBar(source: string, el: HTMLElement) {
		try {
			const params = this.parseProgressBarParams(source);
			const containerEl = el.createDiv({ cls: 'progress-bar-container' });

			const startDate = params.startDate ? new Date(params.startDate) : new Date();
			const endDate = new Date(params.endDate);
			const currentDate = new Date();

			if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
				containerEl.setText('Invalid date format. Please use YYYY-MM-DD format.');
				return;
			}

			if (endDate < startDate) {
				containerEl.setText('End date must be after start date.');
				return;
			}

			const totalDuration = endDate.getTime() - startDate.getTime();
			const elapsedDuration = currentDate.getTime() - startDate.getTime();
			let progress = Math.min(Math.max(elapsedDuration / totalDuration, 0), 1);

			const barColor       = params.color           || this.settings.defaultBarColor;
			const barBgColor     = params.backgroundColor || this.settings.defaultBarBackgroundColor;
			const barType        = params.type            || this.settings.defaultBarType;
			const progressType   = params.progressType    || this.settings.defaultProgressType;
			const onCompleteText = params.onCompleteText  || this.settings.defaultOnCompleteText;

			const progressBarEl = containerEl.createDiv({ cls: 'progress-bar-element' });
			progressBarEl.addClass(`progress-bar-${barType.toLowerCase()}`);

			const infoEl = containerEl.createDiv({ cls: 'progress-bar-info' });
			const remainingTime = this.formatRemainingTime(endDate, currentDate);

			if (progress >= 1) {
				infoEl.setText(onCompleteText);
			} else {
        if (progressType.toLowerCase() === 'countdown') {
          infoEl.setText(`${remainingTime} until completion`);
        } else {
          infoEl.setText(`${Math.round(progress * 100)}% - ${remainingTime} remaining`);
        }
			}

			let bar;
			const commonOptions = {
				strokeWidth: 4,
				color: barColor,
				trailColor: barBgColor,
				trailWidth: 1,
			};

			switch (barType.toLowerCase()) {
				case 'circle':
					bar = new ProgressBar.Circle(progressBarEl, {
						...commonOptions,
						svgStyle: {width: '100%', height: '100%'},
					});
					break;
				case 'semicircle':
					bar = new ProgressBar.SemiCircle(progressBarEl, {
						...commonOptions,
						svgStyle: {width: '100%', height: '100%'},
					});
					break;
				case 'square':
					bar = new ProgressBar.Square(progressBarEl, {
						...commonOptions,
						svgStyle: {width: '100%', height: '100%'},
					});
					break;
				case 'line':
				default:
					bar = new ProgressBar.Line(progressBarEl, {
						...commonOptions,
						svgStyle: {width: '100%', height: '100%'},
					});
					break;
			}

      // Animation support still needs some work
      if (progressType.toLowerCase() === 'countdown') {
        bar.set(1.0 - progress);
      } else {
        bar.set(progress);
      }

			// Add title if provided
			if (params.title) {
				const titleEl = containerEl.createDiv({ cls: 'progress-bar-title' });
				titleEl.setText(params.title);
				containerEl.prepend(titleEl);
			}

		} catch (error) {
			el.setText('Error rendering progress bar: ' + error.message);
		}
	}

	parseProgressBarParams(source: string) {
		const params: any = {};
		const lines = source.trim().split('\n');

		lines.forEach(line => {
			const [key, value] = line.split(':').map(part => part.trim());
			if (key && value) {
				params[key] = value;
			}
		});

		// Ensure required parameters
		if (!params.endDate) {
			throw new Error('End date is required');
		}

		return params;
	}

	formatRemainingTime(endDate: Date, currentDate: Date) {
		const remainingMs = endDate.getTime() - currentDate.getTime();

		if (remainingMs <= 0) {
			return 'Completed';
		}

		const seconds = Math.floor(remainingMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

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

class ProgressBarSettingTab extends PluginSettingTab {
	plugin: ProgressBarPlugin;

	constructor(app: App, plugin: ProgressBarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Progress Bar Settings'});

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
			.setName('Progress type')
			.setDesc('Type of progress bar to display (forward or countdown)')
			.addDropdown(dropdown => dropdown
				.addOption('Forward', 'Forward')
				.addOption('Countdown', 'Countdown')
				.setValue(this.plugin.settings.defaultProgressType)
				.onChange(async (value) => {
					this.plugin.settings.defaultProgressType = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default bar color')
			.setDesc('Default color for the progress bar')
			.addText(text => text
				.setPlaceholder('#4CAF50')
				.setValue(this.plugin.settings.defaultBarColor)
				.onChange(async (value) => {
					this.plugin.settings.defaultBarColor = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default on complete text')
			.setDesc('Default text to display when the progress bar is complete')
			.addText(text => text
				.setPlaceholder('Completed!')
				.setValue(this.plugin.settings.defaultOnCompleteText)
				.onChange(async (value) => {
					this.plugin.settings.defaultOnCompleteText = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default background color')
			.setDesc('Default background color for the progress bar')
			.addText(text => text
				.setPlaceholder('#e0e0e0')
				.setValue(this.plugin.settings.defaultBarBackgroundColor)
				.onChange(async (value) => {
					this.plugin.settings.defaultBarBackgroundColor = value;
					await this.plugin.saveSettings();
				}));
	}
}