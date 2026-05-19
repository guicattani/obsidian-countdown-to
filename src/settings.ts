import { App, PluginSettingTab, Setting } from "obsidian";
import CountdownToPlugin from "./main";
import { LuxonFormatHelpModal } from "./modal";

export interface CountdownToSettings {
  defaultBarColor: string;
  defaultTrailColor: string;
  defaultUpcomingBackgroundColor: string;
  defaultBarType: string;
  defaultProgressType: string;
  defaultOnCompleteText: string;
  defaultInfoFormat: string;
  defaultInfoFormatUpcoming: string;
  defaultUpdateInRealTime: boolean;
  defaultUpdateIntervalSeconds: number;
  defaultColorInGradient: boolean;
  defaultStartColor: string;
  defaultEndColor: string;
  defaultMidColor: string;
}

export const DEFAULT_SETTINGS: CountdownToSettings = {
  defaultBarColor: '#4CAF50',
  defaultTrailColor: '#e0e0e0',
  defaultUpcomingBackgroundColor: '#gggggg', // invalid color so that we know the user didn't set it
  defaultBarType: 'Line',
  defaultProgressType: 'Forward',
  defaultOnCompleteText: '{title} is done!',
  defaultInfoFormat: '{percent}% - {remaining} remaining',
  defaultInfoFormatUpcoming: '{title} is coming up in {remaining}!',
  defaultUpdateInRealTime: false,
  defaultUpdateIntervalSeconds: 1,
  defaultColorInGradient: false,
  defaultStartColor: '#ff5722', 
  defaultEndColor: '#4CAF50',   
  defaultMidColor: ' ', 
};

export class CountdownToSettingTab extends PluginSettingTab {
  plugin: CountdownToPlugin;

  constructor(
    app: App,
    plugin: CountdownToPlugin
  ) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

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
            this.app.workspace.trigger(
              "countdown-to:rerender"
            );
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
            this.app.workspace.trigger(
              "countdown-to:rerender"
            );
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
            this.app.workspace.trigger(
              "countdown-to:rerender"
            );
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
            this.app.workspace.trigger(
              "countdown-to:rerender"
            );
          })
        );
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
          this.app.workspace.trigger(
            "countdown-to:rerender"
          );
        })
      )
      .addExtraButton(button => {
        button
          .setIcon('help')
          .setTooltip('Show format help')
          .onClick(() => {
            new LuxonFormatHelpModal(this.plugin.app).open();
          });
    });

    new Setting(containerEl)
      .setName('Default info format upcoming')
      .setDesc('Default format for the info text when the countdown is upcoming (start date in the future).')
      .addTextArea(text => text
        .setPlaceholder('{title} is coming up in {remaining}!')
        .setValue(this.plugin.settings.defaultInfoFormatUpcoming)
        .onChange(async (value) => {
          this.plugin.settings.defaultInfoFormatUpcoming = value;
          await this.plugin.saveSettings();
          this.app.workspace.trigger(
            "countdown-to:rerender"
          );
        })
      )
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
          this.app.workspace.trigger(
            "countdown-to:rerender"
          );
        })
      );

    new Setting(containerEl).setName('Colors').setHeading();
    new Setting(containerEl)
      .setName('Default bar color')
      .setDesc('Default color for the progress bar')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.defaultBarColor)
        .onChange(async (value) => {
          this.plugin.settings.defaultBarColor = value;
          await this.plugin.saveSettings();
          this.app.workspace.trigger(
            "countdown-to:rerender"
          );
        })
      );

    new Setting(containerEl)
      .setName('Default trail color')
      .setDesc('Default trail color for the progress bar (the incomplete part)')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.defaultTrailColor)
        .onChange(async (value) => {
          this.plugin.settings.defaultTrailColor = value;
          await this.plugin.saveSettings();
          this.app.workspace.trigger(
            "countdown-to:rerender"
          );
        })
      );

    new Setting(containerEl)
      .setName('Default upcoming background color')
      .setDesc('Default background color for countdowns that are upcoming (start date in the future). Needs manual reload of notes to take effect.')
      .addColorPicker(color => color
        .setValue(this.plugin.settings.defaultUpcomingBackgroundColor)
        .onChange(async (value) => {
          this.plugin.settings.defaultUpcomingBackgroundColor = value;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl('br');
    containerEl.createEl('i', { text: 'All settings can be overridden in the markdown code block. If stuck please refer to the ' });
    containerEl.createEl('a', { href: 'https://github.com/guicattani/countdown-to?tab=readme-ov-file#how-to-use', text: 'how to use guide' });
  }
}
