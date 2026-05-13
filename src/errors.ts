export class McpmapError extends Error {
  constructor(message: string, public readonly code = 'MCPMAP_ERROR') {
    super(message);
  }
}
