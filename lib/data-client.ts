export type Table = 'messages' | 'otp_messages' | 'bank_activity' | 'webhook_logs' | 'all_messages';
export const messageTables: Table[] = ['messages', 'otp_messages', 'bank_activity'];
export type PageOptions = { offset?: number; search?: string; unread?: boolean; reminder?: boolean; arrival?: boolean };
async function request(path: string, options?: RequestInit) {
    const response = await fetch(`/api/${path}`, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
        if (response.status === 401) window.location.assign('/login');
        throw new Error('Unable to access dashboard records. Please retry.');
    }
    return response.json();
}
export function getRecords(table: string, limit = 12, options: PageOptions | boolean = {}) {
    const page = typeof options === 'object' ? options : {};
    const query = new URLSearchParams({ limit: String(limit), offset: String(page.offset || 0), search: page.search || '', unread: String(!!page.unread), reminder: String(!!page.reminder), arrival: String(!!page.arrival) });
    return request(`data/${table}?${query}`);
}
export function deleteRecord(table: string, id: string) { return request(`data/${table}`, { method: 'DELETE', body: JSON.stringify({ id }) }); }
export function updateMetadata(table: string, id: string, key: string, value: boolean) { return request(`data/${table}`, { method: 'PATCH', body: JSON.stringify({ id, key, value }) }); }
export function purgeRecords() { return request('purge', { method: 'POST' }); }
export function exportRecords() { return request('export', { method: 'POST' }); }
export function getAnalytics() { return request(`analytics?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata')}`); }
