interface Point {
  x: number;
  y: number;
}

export function calculateBezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number = 0.5
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const cx1 = x1 + dx * curvature;
  const cy1 = y1;
  const cx2 = x2 - dx * curvature;
  const cy2 = y2;

  if (distance < 50) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

export function getCardCenter(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function generateConnectionPath(
  fromElement: HTMLElement,
  toElement: HTMLElement,
  curvature?: number
): string {
  const from = getCardCenter(fromElement);
  const to = getCardCenter(toElement);
  return calculateBezierPath(from.x, from.y, to.x, to.y, curvature);
}
