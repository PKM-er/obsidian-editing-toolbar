import { Editor, EditorChange, EditorRange, HeadingCache,MarkdownView } from 'obsidian'
//from  https://github.com/onlyafly/number-headings-obsidian/blob/master/src/numbering.ts

const TOC_LIST_ITEM_BULLET = '-';

 interface NumberHeadingsPluginSettings {
    skipTopLevel: boolean,
    firstLevel: number,
    maxLevel: number,
    styleLevel1: string,
    styleLevelOther: string,
    auto: boolean,
    separator: string,
    contents: string
  }
  
const DEFAULT_SETTINGS: NumberHeadingsPluginSettings = {
    skipTopLevel: false,
    firstLevel: 1,
    maxLevel: 6,
    styleLevel1: '1',
    styleLevelOther: '1',
    auto: false,
    separator: '',
    contents: ''
  }

function makeHeadingHashString (editor: Editor, heading: HeadingCache): string | undefined {
  const regex = /^\s{0,4}#+/g
  const headingLineString = editor.getLine(heading.position.start.line)
  if (!headingLineString) return undefined

  const matches = headingLineString.match(regex)
  if (!matches) return undefined

  if (matches.length !== 1) {
    // eslint-disable-next-line no-console
    console.log("Unexpected heading format: '" + headingLineString + "'")
    return undefined
  }

  const match = matches[0]
  return match.trimLeft()
}

function makeNumberingString (numberingStack: NumberingToken[]): string {
  let numberingString = ''

  for (let i = 0; i < numberingStack.length; i++) {
    if (i === 0) {
      numberingString += ' '
    } else {
      numberingString += '.'
    }
    numberingString += numberingStack[i].toString()
  }

  return numberingString
}

function getHeadingPrefixRange (editor: Editor, heading: HeadingCache): EditorRange | undefined {
  const regex = /^\s{0,4}#+( )?([0-9]+\.|[A-Z]\.)*([0-9]+|[A-Z])?[:.-]?( )+/g
  const headingLineString = editor.getLine(heading.position.start.line)
  if (!headingLineString) return undefined

  const matches = headingLineString.match(regex)

  if (matches && matches.length !== 1) {
    // eslint-disable-next-line no-console
    console.log("Unexpected heading format: '" + headingLineString + "'")
    return undefined
  }

  const match = matches ? matches[0] : ''

  const from = {
    line: heading.position.start.line,
    ch: 0
  }
  const to = {
    line: heading.position.start.line,
    ch: match.length
  }

  return { from, to }
}

type NumberingToken = string | number

function zerothNumberingTokenInStyle (style: string): NumberingToken {
  if (style === '1') {
    return 0
  } else if (style === 'A') {
    return 'Z'
  }

  return 0
}

function firstNumberingTokenInStyle (style: string): NumberingToken {
  if (style === '1') {
    return 1
  } else if (style === 'A') {
    return 'A'
  }

  return 1
}

function nextNumberingToken (t: NumberingToken): NumberingToken {
  if (typeof t === 'number') {
    return t + 1
  }

  if (typeof t === 'string') {
    if (t === 'Z') return 'A'
    else return String.fromCharCode(t.charCodeAt(0) + 1)
  }

  return 1
}

function cleanHeadingTextForToc (htext: string): string {
  if (htext.contains('^')) {
    const x = htext.split('^')
    if (x.length > 1) {
      return x[0].trim()
    }
  }
  return htext.trim()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createTocEntry (h: HeadingCache, settings: NumberHeadingsPluginSettings, initialHeadingLevel: number):string {
  const text = h.heading
  const cleanText = cleanHeadingTextForToc(text)

  let bulletIndent = ''
  const startLevel = initialHeadingLevel
  for (let i = startLevel; i < h.level; i++) {
    bulletIndent += '\t'
  }

  const entryLink = `[[#${text}|${cleanText}]]`

  return bulletIndent + TOC_LIST_ITEM_BULLET + ' ' + entryLink
}

// Replace a range, but only if there is a change in text, to prevent poluting the undo stack
function replaceRangeSafely (editor: Editor, changes: EditorChange[], range: EditorRange, text: string): void {
  const previousText = editor.getRange(range.from, range.to)

  if (previousText !== text) {
    changes.push({
      text: text,
      from: range.from,
      to: range.to
    })
  }
}

export const updateHeadingNumbering = (viewInfo:any): void => {
  if (!viewInfo) return
  const headings = viewInfo.data.headings ?? []
  const editor = viewInfo.editor
  const settings=DEFAULT_SETTINGS;
  let previousLevel = 1

  let numberingStack: NumberingToken[] = [zerothNumberingTokenInStyle(settings.styleLevel1)]

  if (settings.firstLevel > 1) {
    previousLevel = settings.firstLevel
  } else if (settings.skipTopLevel) {
    previousLevel = 2
  }

  const changes: EditorChange[] = []

  for (const heading of headings) {
    // Update the numbering stack based on the level and previous level

    const level = heading.level

    // Handle skipped & ignored levels.
    if ((settings.firstLevel > level) || (settings.skipTopLevel && level === 1)) {
      // Resets the numbering when a level is skipped.
      // Note: This leaves headings as they are, allowing people to have numbers at the start of
      // ignored headings.

      numberingStack = [zerothNumberingTokenInStyle(settings.styleLevel1)]

      if (settings.firstLevel > 1) {
        previousLevel = settings.firstLevel
      } else if (settings.skipTopLevel) {
        previousLevel = 2
      }
      continue
    }

    // Adjust numbering stack
    if (level === previousLevel) {
      const x = numberingStack.pop()
      if (x !== undefined) {
        numberingStack.push(nextNumberingToken(x))
      }
    } else if (level < previousLevel) {
      for (let i = previousLevel; i > level; i--) {
        numberingStack.pop()
      }
      const x = numberingStack.pop()
      if (x !== undefined) {
        numberingStack.push(nextNumberingToken(x))
      }
    } else if (level > previousLevel) {
      for (let i = previousLevel; i < level; i++) {
        numberingStack.push(firstNumberingTokenInStyle(settings.styleLevelOther))
      }
    }

    // Set the previous level to this level for the next iteration
    previousLevel = level

    if (level > settings.maxLevel) {
      // If we are above the max level, just don't number it
      continue
    }

    // Find the range to replace, and then do it
    const prefixRange = getHeadingPrefixRange(editor, heading)
    if (prefixRange === undefined) return
    const headingHashString = makeHeadingHashString(editor, heading)
    if (headingHashString === undefined) return
    const prefixString = makeNumberingString(numberingStack)
    replaceRangeSafely(editor, changes, prefixRange, headingHashString + prefixString + settings.separator + ' ')
  }

  // Execute the transaction to make all the changes at once
  if (changes.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Number Headings Plugin: Applying headings numbering changes:', changes.length)
    editor.transaction({
      changes: changes
    })
  }
}
function doesContentsHaveValue (x: string): boolean {
    if (x.length > 2 && x.startsWith('^')) return true
    return false
  }
export const updateTableOfContents = (
 viewInfo:any | undefined
): void => {
  if (!viewInfo) return
  const headings = viewInfo.data.headings ?? []
  const editor = viewInfo.editor
  const settings=DEFAULT_SETTINGS;
  if (!doesContentsHaveValue(settings.contents)) return

  let tocHeading: HeadingCache | undefined
  let tocBuilder = '\n'
  const changes: EditorChange[] = []

  // In case headings start above level 1, we don't want to indent the bullets too much
  let initialHeadingLevel = 1
  if (headings.length > 0) {
    initialHeadingLevel = headings[0].level
  }

  for (const heading of headings) {
    // ORDERING: Important to find the TOC heading before skipping skipped headings, since that is for numbering

    // Find the TOC heading
    if (heading.heading.endsWith(settings.contents)) {
      tocHeading = heading
    }

    /* This code lets us skip TOC lines for skipped headings, but doesn't work well with first-level setting
    if ((settings.skipTopLevel && heading.level === 1) || (heading.level > settings.maxLevel)) {
      continue
    }
    */

    const tocEntry = createTocEntry(heading, settings, initialHeadingLevel)
    tocBuilder += tocEntry + '\n'
  }

  // Insert the generated table of contents
  if (tocHeading) {
    const from = {
      line: tocHeading.position.start.line + 1,
      ch: 0
    }

    const startingLine = tocHeading.position.start.line + 1
    let endingLine = 0
    let foundList = false
    for (endingLine = startingLine; ; endingLine++) {
      const line = editor.getLine(endingLine)
      if (line === undefined) {
        // Reached end of file, insert at the start of the TOC section
        endingLine = startingLine
        break
      }
      const trimmedLineText = line.trimStart()
      if (foundList) {
        if (!trimmedLineText.startsWith(TOC_LIST_ITEM_BULLET)) break
        if (trimmedLineText.startsWith('#')) break
      } else {
        if (trimmedLineText.startsWith(TOC_LIST_ITEM_BULLET)) {
          foundList = true
        } else if (trimmedLineText.startsWith('#')) {
          // Reached the next heading without finding existing TOC list, insert at the start of the TOC section
          endingLine = startingLine
          break
        } else {
          continue
        }
      }
    }

    if (tocBuilder === '\n') {
      tocBuilder = ''
    }

    const to = {
      line: endingLine,
      ch: 0
    }
    const range = { from, to }
    replaceRangeSafely(editor, changes, range, tocBuilder)
  }

  // Execute the transaction to make all the changes at once
  if (changes.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Number Headings Plugin: Applying table of contents changes:', changes.length)
    editor.transaction({
      changes: changes
    })
  }
}

export const removeHeadingNumbering = (
  viewInfo: any | undefined
): void => {
  if (!viewInfo) return
  const headings = viewInfo.data.headings ?? []
  const editor = viewInfo.editor

  const changes: EditorChange[] = []

  for (const heading of headings) {
    const prefixRange = getHeadingPrefixRange(editor, heading)
    if (prefixRange === undefined) return
    const headingHashString = makeHeadingHashString(editor, heading)
    if (headingHashString === undefined) return
    replaceRangeSafely(editor, changes, prefixRange, headingHashString + ' ')
  }

  if (changes.length > 0) {
    editor.transaction({
      changes: changes
    })
  }
}