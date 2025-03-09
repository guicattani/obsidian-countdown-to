

# CountdownTo

![CountdownTo](./screenshot.png)

Track time until important deadlines, events, or milestones with visual progress indicators.

## Features

- Create visual progress bars that count down to specific dates
- Different progress bar types: `Line`, `Circle`, `SemiCircle`, and `Square`
- Customizable appearance with color options
- Flexible date and time formatting using Luxon
- Custom info text with placeholders for dates, percentages, and durations
- Progress can be shown as forward progress or as a countdown (days until)
- Configurable completion messages

## Manual Installation

1. Download the latest release from the [GitHub releases page](https://github.com/guicattani/countdown-to/releases)
2. Extract the files to your Obsidian vault's plugins folder: `<vault>/.obsidian/plugins/countdown-to/`
3. Reload Obsidian
4. Enable the plugin in Obsidian settings under Community Plugins

## How to Use

Create a countdown progress bar by adding a code block with the `progressbar` language identifier:

````markdown
```progressbar
title: Project Deadline
startDate: 2025-03-12
endDate: 2025-04-11
type: Circle
color: #ff5722
trailColor: #f5f5f5
progressType: countdown
infoFormat: {percent}% complete - {remaining} until {end(LLL d, yyyy)}
```
````

### Required Parameters

- `endDate`: The target date to count down to (ISO format: YYYY-MM-DDTHH:MM:SS)
- `startDate`: Start date for the progress calculation (ISO format: YYYY-MM-DDTHH:MM:SS)

### Optional Parameters

- `title`: Title of the countdown (show above the progress bar)
- `type`: Progress bar type - `line`, `circle`, `semicircle`, or `square` (defaults to `line`)
- `color`: Color for the progress bar (HEX format)
- `trailColor`: Color for the incomplete part of the progress bar (HEX format)
- `progressType`: `progress` (default) or `countdown`
- `onCompleteText`: Text to display when the countdown is complete
- `infoFormat`: Custom format for the information text

## Formatting Options

The `infoFormat` parameter supports various placeholders and Luxon formatting options:

### Basic Placeholders

- `{percent}` - Percentage of completion
- `{start}` - Start date (ISO format)
- `{end}` - End date (ISO format)
- `{current}` - Current date (ISO format)
- `{remaining}` - Remaining time in human-readable format
- `{elapsed}` - Elapsed time in human-readable format
- `{total}` - Total duration in human-readable format

### Luxon Formatting

You can format dates and durations using [Luxon's](https://moment.github.io/luxon/#/formatting?id=table-of-tokens) formatting syntax:

- `{start(format)}` - Format start date
- `{end(format)}` - Format end date
- `{current(format)}` - Format current date
- `{remaining(format)}` - Format remaining duration
- `{elapsed(format)}` - Format elapsed duration
- `{total(format)}` - Format total duration

Examples:
- `{end(LLL d, yyyy)}` displays the end date as "Apr 11, 2025"
- `{end(EEEE, MMMM d, yyyy)}` displays as "Thursday, April 11, 2025"

See the [Luxon formatting reference](https://moment.github.io/luxon/#/formatting?id=table-of-tokens) for all available format tokens.

## Configuration

You can configure default settings for all progress bars in the plugin settings:

1. Open Obsidian Settings
2. Navigate to the "Countdown To" plugin settings
3. Customize the default bar type, colors, progress type, and info format

All settings can be overridden in individual progress bar code blocks.

## Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/guicattani/countdown-to/issues) on GitHub.

## Credits

- Uses [progressbar.js](https://kimmobrunfeldt.github.io/progressbar.js/) for rendering progress bars
- Uses [Luxon](https://moment.github.io/luxon/) for date and time handling
