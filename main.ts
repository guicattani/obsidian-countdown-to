import { Plugin } from 'obsidian';
import { Circle } from 'progressbar.js';

const ALL_EMOJIS: Record<string, string> = {
  ':+1:': '👍',
  ':sunglasses:': '😎',
  ':smile:': '😄',
};

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.registerMarkdownPostProcessor((element, context) => {
      const codeblocks = element.findAll('code');

      console.log(codeblocks)
      for (let codeblock of codeblocks) {
        const text = codeblock.innerText.trim();
        if (text[0] === ':' && text[text.length - 1] === ':') {
          const emojiEl = codeblock.createSpan({
            text: ALL_EMOJIS[text] ?? text,
          });
          if (emojiEl) {
            var el = codeblock.createEl("div")
            console.log(el)
            var bar = new Circle(el, {
              color: '#aaa',
              // This has to be the same size as the maximum width to
              // prevent clipping
              strokeWidth: 4,
              trailWidth: 1,
              easing: 'easeInOut',
              duration: 1400,
              text: {
                autoStyleContainer: false
              },
              from: { color: '#aaa', width: 1 },
              to: { color: '#333', width: 4 },
              // Set default step function for all animate calls
              step: function(state, circle) {
                circle.path.setAttribute('stroke', state.color);
                circle.path.setAttribute('stroke-width', state.width);

                var value = Math.round(circle.value() * 100);
                if (value === 0) {
                  circle.setText('');
                } else {
                  circle.setText(value);
                }

              }
            });
            // bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
            // bar.text.style.fontSize = '2rem';
            bar.animate(1.0);
          }
        }
      }
    });
  }
}