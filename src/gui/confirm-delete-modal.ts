import { App, Modal, Setting } from "obsidian";

export interface PendingDeletion {
  id: number;
  front: string;
}

/**
 * Lists the Anki notes a sync is about to delete and resolves true only if
 * the user confirms. Closing the modal any other way keeps the notes.
 */
export class ConfirmDeleteModal extends Modal {
  private decided = false;

  constructor(
    app: App,
    private readonly pending: PendingDeletion[],
    private readonly resolve: (confirmed: boolean) => void
  ) {
    super(app);
  }

  static ask(app: App, pending: PendingDeletion[]): Promise<boolean> {
    return new Promise((resolve) =>
      new ConfirmDeleteModal(app, pending, resolve).open()
    );
  }

  onOpen() {
    const { contentEl } = this;
    const n = this.pending.length;
    this.titleEl.setText(`Delete ${n} card${n === 1 ? "" : "s"} from Anki?`);
    contentEl.createEl("p", {
      text: "These IDs no longer have card content above them. Deleting removes the notes and their review history from Anki.",
    });

    const list = contentEl.createEl("ul");
    for (const { id, front } of this.pending) {
      const item = list.createEl("li");
      item.createEl("code", { text: String(id) });
      item.appendText(" " + (front || "(not found in Anki)"));
    }

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Keep").onClick(() => this.finish(false))
      )
      .addButton((b) =>
        b
          .setButtonText("Delete")
          .setWarning()
          .onClick(() => this.finish(true))
      );
  }

  onClose() {
    this.contentEl.empty();
    if (!this.decided) this.resolve(false);
  }

  private finish(confirmed: boolean) {
    this.decided = true;
    this.resolve(confirmed);
    this.close();
  }
}
