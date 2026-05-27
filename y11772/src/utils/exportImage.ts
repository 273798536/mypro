export function exportCanvasAsImage(canvasSelector: string, filename: string): boolean {
  const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement | null
  if (!canvas) return false

  const link = document.createElement("a")
  link.download = filename
  link.href = canvas.toDataURL("image/png")
  link.click()
  return true
}
