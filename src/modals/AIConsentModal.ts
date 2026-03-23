import { App, ButtonComponent, Modal } from "obsidian";
import { t } from "src/translations/helper";

interface AIConsentModalOptions {
  source?: "startup" | "settings";
}

export class AIConsentModal extends Modal {
  private readonly options: AIConsentModalOptions;
  private resolver: ((accepted: boolean) => void) | null = null;
  private settled = false;

  constructor(app: App, options: AIConsentModalOptions = {}) {
    super(app);
    this.options = options;
  }

  openAndWait(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass("editing-toolbar-ai-consent-modal");
    contentEl.empty();
    contentEl.addClass("editing-toolbar-ai-consent");

    const hero = contentEl.createDiv("editing-toolbar-ai-consent-hero");
    hero.createDiv({
      cls: "editing-toolbar-ai-consent-badge",
      text: this.options.source === "startup" ? t("Try AI Editing") : t("Enable AI Editor"),
    });
    hero.createEl("h2", { text: t("Enable AI Editor") });
    hero.createDiv({
      cls: "editing-toolbar-ai-consent-desc",
      text: t("Unlock inline completion, rewrite, frontmatter, and canvas generation right inside your toolbar."),
    });
    hero.createDiv({
      cls: "editing-toolbar-ai-consent-note",
      text: t("Sign in to PKMer AI for free managed AI, or use your own compatible model."),
    });

    const features = contentEl.createDiv("editing-toolbar-ai-consent-section");
    features.createDiv({
      cls: "editing-toolbar-ai-consent-section-title",
      text: t("What you get"),
    });
    const featuresList = features.createDiv("editing-toolbar-ai-consent-list");
    this.createListItem(featuresList, t("Inline completion while you write"));
    this.createListItem(featuresList, t("Rewrite, summarize, and continue text in place"));
    this.createListItem(featuresList, t("Generate frontmatter, lists, tables, and canvas drafts"));

    const privacy = contentEl.createDiv("editing-toolbar-ai-consent-section");
    privacy.createDiv({
      cls: "editing-toolbar-ai-consent-section-title",
      text: t("Before you enable AI"),
    });
    const privacyList = privacy.createDiv("editing-toolbar-ai-consent-list");
    this.createListItem(privacyList, t("The plugin itself does not intentionally store your note content."));
    this.createListItem(privacyList, t("AI requests are sent only to the provider you choose, such as PKMer AI or your custom model."));
    this.createListItem(privacyList, t("Those requests remain subject to the provider privacy policy, terms, and model rules."));
    this.createListItem(privacyList, t("You can turn AI off at any time in settings."));

    const actions = contentEl.createDiv("editing-toolbar-ai-consent-actions");
    new ButtonComponent(actions)
      .setButtonText(t("Not now"))
      .onClick(() => this.finish(false));

    new ButtonComponent(actions)
      .setButtonText(t("Agree & Enable AI"))
      .setCta()
      .onClick(() => this.finish(true));
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolve(false);
  }

  private createListItem(parent: HTMLElement, text: string): void {
    const item = parent.createDiv("editing-toolbar-ai-consent-item");
    item.createSpan({ cls: "editing-toolbar-ai-consent-dot" });
    item.createSpan({ cls: "editing-toolbar-ai-consent-text", text });
  }

  private finish(accepted: boolean): void {
    this.resolve(accepted);
    this.close();
  }

  private resolve(accepted: boolean): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolver?.(accepted);
    this.resolver = null;
  }
}