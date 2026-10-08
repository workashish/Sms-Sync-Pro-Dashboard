'use client';
import { useState } from 'react';
export function MessageBody({ body, unread = false }: { body: string; unread?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const long = body.length > 320;
    let preview = body.slice(0, 320);
    if (/^[\uD800-\uDBFF]$/.test(preview.slice(-1))) preview += body[320] || '';
    return <div>
        <p className={`text-sm whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300 ${unread ? 'font-medium text-slate-800 dark:text-slate-200' : ''}`}>{expanded || !long ? body : `${preview}…`}</p>
        {long && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{expanded ? 'Show less' : 'Show full message'}</button>}
    </div>;
}
