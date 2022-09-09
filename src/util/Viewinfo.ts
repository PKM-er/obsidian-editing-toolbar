import { App, CachedMetadata, Editor, MarkdownView } from 'obsidian'

function getActiveView (app: App): MarkdownView | undefined {
  const activeView = app.workspace.getActiveViewOfType(MarkdownView)
  return activeView ?? undefined
}

export function isViewActive (app: App): boolean {
  const activeView = getActiveView(app)
  if (activeView && activeView.file) return true
  return false
}

function getViewMetadata (app: App): CachedMetadata | undefined {
  const activeView = getActiveView(app)
  if (activeView && activeView.file) {
    const data = app.metadataCache.getFileCache(activeView.file) || {}
    return data
  }
  return undefined
}

export interface ViewInfo {
  activeView: MarkdownView
  data: CachedMetadata
  editor: Editor
}

export function getViewInfo (app: App): ViewInfo | undefined {
  const activeView = getActiveView(app)
  const data = getViewMetadata(app)
  const editor = activeView ? activeView.editor : undefined

  if (activeView && data && editor) {
    return {
      activeView, data, editor
    }
  }

  return undefined
}