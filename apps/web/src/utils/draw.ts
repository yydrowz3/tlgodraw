export function isDrawIoXmlContent(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith("<mxfile") ||
    trimmed.startsWith("<mxGraphModel") ||
    trimmed.includes("<mxCell") ||
    trimmed.includes("<diagram")
  );
}
