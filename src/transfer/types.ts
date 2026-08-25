export type ImportProvider = 'toby' | 'tabme' | 'tabspace'

export interface ImportedTab {
  title: string
  url: string
  alias?: string
  avatarEmoji?: string
}

export interface ImportedGroup {
  name: string
  color?: string
  tabs: ImportedTab[]
}

export interface ImportedSpace {
  name: string
  emoji?: string
  color?: string
  groups: ImportedGroup[]
  ungroupedTabs: ImportedTab[]
}

export interface ImportPreview {
  provider: ImportProvider
  spaces: ImportedSpace[]
  warnings: string[]
  skippedRecords: number
}
