export class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function readJson(req: Request, maxBytes = 8192): Promise<unknown> {
    if (Number(req.headers.get('content-length')) > maxBytes) throw new RequestError('Request too large', 413);
    const reader = req.body?.getReader();
    if (!reader) throw new RequestError('Empty request', 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new RequestError('Request too large', 413); }
        chunks.push(value);
    }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new RequestError('Invalid JSON', 400); }
}
