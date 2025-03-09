import { App, Plugin, PluginSettingTab, Setting, Modal } from 'obsidian';
import { DateTime, Duration, Interval } from 'luxon';
import * as ProgressBar from 'progressbar.js';

interface ProgressBarSettings {
	defaultBarColor: string;
	defaultTrailColor: string;
	defaultBarType: string;
	defaultProgressType: string;
	defaultOnCompleteText: string;
	defaultInfoFormat: string;
}

const DEFAULT_SETTINGS: ProgressBarSettings = {
	defaultBarColor: '#4CAF50',
	defaultTrailColor: '#e0e0e0',
	defaultBarType: 'Line',
	defaultProgressType: 'forward',
	defaultOnCompleteText: '{title} is done!',
	defaultInfoFormat: '{percent}% - {remaining} remaining',
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
			const containerEl = el.createDiv({ cls: 'countdown-to-container' });

			const startDate = params.startDate ?
				DateTime.fromISO(params.startDate) :
				DateTime.now();
			const endDate = DateTime.fromISO(params.endDate);
			const currentDate = DateTime.now();

			if (!startDate.isValid || !endDate.isValid) {
				containerEl.setText('Invalid date format. Please use ISO format (YYYY-MM-DDTHH:MM:SS).');
				return;
			}

			const totalInterval = Interval.fromDateTimes(startDate, endDate);
			const elapsedInterval = Interval.fromDateTimes(startDate, currentDate);

			const totalMillis = totalInterval.length();
			const elapsedMillis = Math.min(elapsedInterval.length(), totalMillis);

			let progress = Math.min(Math.max(elapsedMillis / totalMillis, 0), 1);

			const barColor = params.color || this.settings.defaultBarColor;
			const trailColor = params.trailColor || this.settings.defaultTrailColor;
			const barType = params.type || this.settings.defaultBarType;
			const progressType = params.progressType || this.settings.defaultProgressType;
			const onCompleteText = params.onCompleteText || this.settings.defaultOnCompleteText;
			const infoFormat = params.infoFormat || this.settings.defaultInfoFormat;

			const progressBarEl = containerEl.createDiv({ cls: 'progress-bar-element' });
			progressBarEl.addClass(`progress-bar-${barType.toLowerCase()}`);

			const infoEl = containerEl.createDiv({ cls: 'progress-bar-info' });

			if (progress >= 1) {
				infoEl.setText(
          onCompleteText.replace(/{title}/g, params.title || '')
        );
			} else {
				let infoText = infoFormat;

				const remainingInterval = Interval.fromDateTimes(currentDate, endDate);
				const remainingDuration = remainingInterval.toDuration(['days', 'hours', 'minutes', 'seconds']);

				const elapsedDuration = elapsedInterval.toDuration(['days', 'hours', 'minutes', 'seconds']);

				const totalDuration = totalInterval.toDuration(['days', 'hours', 'minutes', 'seconds']);
				infoText = infoText
					.replace(/{start\((.*?)\)}/g, (_match: string, format: string) => startDate.toFormat(format))
					.replace(/{end\((.*?)\)}/g, (_match: string, format: string) => endDate.toFormat(format))
					.replace(/{current\((.*?)\)}/g, (_match: string, format: string) => currentDate.toFormat(format))
					.replace(/{remaining\((.*?)\)}/g, (_match: string, format: string) => remainingDuration.toFormat(format))
					.replace(/{elapsed\((.*?)\)}/g, (_match: string, format: string) => elapsedDuration.toFormat(format))
					.replace(/{total\((.*?)\)}/g, (_match: string, format: string) => totalDuration.toFormat(format));

				infoText = infoText
					.replace(/{percent}/g, Math.round(progress * 100).toString())
					.replace(/{start}/g, startDate.toISODate() || '')
					.replace(/{end}/g, endDate.toISODate() || '')
					.replace(/{current}/g, currentDate.toISODate() || '')
					.replace(/{remaining}/g, this.formatDuration(remainingDuration))
					.replace(/{elapsed}/g, this.formatDuration(elapsedDuration))
					.replace(/{total}/g, this.formatDuration(totalDuration));

				infoEl.setText(infoText);
			}

			let bar;
			const commonOptions = {
				strokeWidth: 4,
				color: barColor,
				trailColor: trailColor,
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

			if (progressType.toLowerCase() === 'countdown') {
				bar.set(1.0 - progress);
			} else {
				bar.set(progress);
			}

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

class ProgressBarSettingTab extends PluginSettingTab {
	plugin: ProgressBarPlugin;

	constructor(app: App, plugin: ProgressBarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Countdown To Settings'});
    containerEl.createEl('a', {href: 'https://github.com/guicattani/countdown-to?tab=readme-ov-file#how-to-use', text: 'How to use'});

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
			.setDesc('Default text to display when the progress is complete. Use {title} to display the title of the progress bar.')
			.addText(text => text
				.setPlaceholder('{title} is done!')
				.setValue(this.plugin.settings.defaultOnCompleteText)
				.onChange(async (value) => {
					this.plugin.settings.defaultOnCompleteText = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default trail color')
			.setDesc('Default trail color for the progress bar (the incomplete part)')
			.addText(text => text
				.setPlaceholder('#e0e0e0')
				.setValue(this.plugin.settings.defaultTrailColor)
				.onChange(async (value) => {
					this.plugin.settings.defaultTrailColor = value;
					await this.plugin.saveSettings();
				}));
    containerEl.createEl('i', {text: 'All settings can be overridden in the markdown code block.'});
	}
}

class LuxonFormatHelpModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: 'Info Format Help'});

		contentEl.createEl('h3', {text: 'Placeholders'});
		const placeholdersList = contentEl.createEl('ul');
		placeholdersList.createEl('li', {text: '{percent} - Percentage of completion'});
		placeholdersList.createEl('li', {text: '{start} - Start date (ISO format)'});
		placeholdersList.createEl('li', {text: '{end} - End date (ISO format)'});
		placeholdersList.createEl('li', {text: '{current} - Current date (ISO format)'});
		placeholdersList.createEl('li', {text: '{remaining} - Remaining time'});
		placeholdersList.createEl('li', {text: '{elapsed} - Elapsed time'});
		placeholdersList.createEl('li', {text: '{total} - Total duration'});

		contentEl.createEl('h3', {text: 'Formatting'});
		contentEl.createEl('p', {text: 'You can use Luxon formatting for dates:'});
		const luxonList = contentEl.createEl('ul');
		luxonList.createEl('li', {text: '{start(format)} - Format start date'});
		luxonList.createEl('li', {text: '{end(format)} - Format end date'});
		luxonList.createEl('li', {text: '{current(format)} - Format current date'});
		luxonList.createEl('li', {text: '{remaining(format)} - Format remaining time'});
		luxonList.createEl('li', {text: '{elapsed(format)} - Format elapsed time'});
		luxonList.createEl('li', {text: '{total(format)} - Format total duration'});
    contentEl.createEl('a', {href: 'https://moment.github.io/luxon/#/formatting?id=table-of-tokens', text: 'Luxon Formatting Reference'});

		contentEl.createEl('h3', {text: 'Examples'});
		const examplesList = contentEl.createEl('ul');
		examplesList.createEl('li', {text: '{percent}% complete - {remaining} left'});
		examplesList.createEl('li', {text: 'Started on {start(LLL d)}, ends on {end(LLL d, yyyy)}'});
		examplesList.createEl('li', {text: '{elapsed} elapsed out of {total} total'});

		contentEl.createEl('h3', {text: 'Common Luxon Formats'});
		const formatsTable = contentEl.createEl('table');
		const headerRow = formatsTable.createEl('tr');
		headerRow.createEl('th', {text: 'Format'});
		headerRow.createEl('th', {text: 'Output'});

		const addFormatRow = (format: string, output: string) => {
			const row = formatsTable.createEl('tr');
			row.createEl('td', {text: format});
			row.createEl('td', {text: output});
		};

		addFormatRow('yyyy-MM-dd', '2025-04-11');
		addFormatRow('LLL d, yyyy', 'Apr 11, 2025');
		addFormatRow('EEEE, MMMM d, yyyy', 'Thursday, April 11, 2025');
		addFormatRow('d MMMM yyyy', '11 April 2025');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}