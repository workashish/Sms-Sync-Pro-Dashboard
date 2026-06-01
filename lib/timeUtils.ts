export function formatLocalTime(isoString?: string, fallbackString?: string): string {
    if (isoString) {
        try {
            const date = new Date(isoString);
            if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(date);
            }
        } catch (e) {
            // Let it fall through
        }
    }
    return fallbackString || "";
}
