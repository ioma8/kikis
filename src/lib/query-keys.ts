export const queryKeys = {
  board: (boardId?: string) => ['board', boardId] as const,
  profile: (userId?: string) => ['profile', userId] as const,
  workspace: (workspaceId?: string) => ['workspace', workspaceId] as const,
  archive: (workspaceId?: string) => ['archive', workspaceId] as const,
} as const
