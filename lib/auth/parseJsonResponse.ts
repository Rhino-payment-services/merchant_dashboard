export async function parseJsonResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<{ data: T; rawText: string }> {
  const rawText = await response.text()
  if (!rawText.trim()) {
    return { data: {} as T, rawText }
  }
  try {
    return { data: JSON.parse(rawText) as T, rawText }
  } catch {
    throw new Error(
      response.ok
        ? 'Invalid response from server'
        : `Server error ${response.status}`,
    )
  }
}
