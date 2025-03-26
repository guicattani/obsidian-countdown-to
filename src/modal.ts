import { Modal } from 'obsidian';

export class LuxonFormatHelpModal extends Modal {
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
    placeholdersList.createEl('li', { text: '{total} - Total duration (in days)' });

    contentEl.createEl('h3', { text: 'Formatting' });
    contentEl.createEl('a', { href: 'https://moment.github.io/luxon/#/formatting?id=table-of-tokens', text: 'Luxon Formatting Reference' });

    contentEl.createEl('h4', { text: 'Date formatting' });
    contentEl.createEl('p', { text: 'You can use Luxon formatting for dates (replace *format* with the format you want):' });
    const dateLuxonList = contentEl.createEl('ul');
    dateLuxonList.createEl('li', { text: '{start:*format*} - Format start date' });
    dateLuxonList.createEl('li', { text: '{end:*format*} - Format end date' });
    dateLuxonList.createEl('li', { text: '{current:*format*} - Format current date' });

    contentEl.createEl('h5', { text: 'Examples' });
    const dateExamplesList = contentEl.createEl('ul');
    dateExamplesList.createEl('li', { text: '{start:LLL d, yyyy} - Start date' });
    dateExamplesList.createEl('li', { text: '{end:LLL d, yyyy} - End date' });
    dateExamplesList.createEl('li', { text: '{current:LLL d, yyyy} - Current date' });


    contentEl.createEl('h4', { text: 'Duration formatting' });
    contentEl.createEl('p', { text: 'For durations, the only tokens that are supported are for years, months, weeks, days, hours, minutes and seconds:' });
    const durationLuxonList = contentEl.createEl('ul');
    durationLuxonList.createEl('li', { text: '{remaining:*format*} - Format remaining time' });
    durationLuxonList.createEl('li', { text: '{elapsed:*format*} - Format elapsed time' });
    durationLuxonList.createEl('li', { text: '{total:*format*} - Format total duration' });

    contentEl.createEl('h5', { text: 'Examples' });
    const durationExamplesList = contentEl.createEl('ul');
    durationExamplesList.createEl('li', { text: '{percent}% complete - {remaining} left' });
    durationExamplesList.createEl('li', { text: '{elapsed} elapsed out of {total} total' });

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