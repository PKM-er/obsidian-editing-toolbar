import type { ToolbarCommand } from "src/settings/ToolbarSettings";

export const AI_TOOLBAR_COMMAND_ID = "editing-toolbar:ai-tools";

export function createAIToolbarCommand(): ToolbarCommand {
  return {
    id: AI_TOOLBAR_COMMAND_ID,
    name: "AI Tools",
    icon: "lucide-sparkles",
  };
}
