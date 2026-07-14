export function shouldRefreshKnowledgeFiles({
  isVisible,
  previousIsVisible,
  refreshToken,
  lastLoadedToken,
}) {
  if (!isVisible) {
    return false
  }

  return !previousIsVisible || refreshToken !== lastLoadedToken
}
