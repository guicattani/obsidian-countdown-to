import "obsidian";

declare module "obsidian" {
  interface Workspace {
    on(
      name: "countdown-to:rerender",
      callback: () => void
    ): EventRef;
  }
}
