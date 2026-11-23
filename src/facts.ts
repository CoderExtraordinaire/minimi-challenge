export interface ProposedFact {
    item: string;
    value: string;
    source_url: string;
}

export function extractFacts(text: string): { clean: string; facts: ProposedFact[] } {
    const match = text.match(/<facts>([\s\S]*?)<\/facts>/);
    const clean = text.replace(/<facts>[\s\S]*?(<\/facts>|$)/g, "").trim();
    if (!match) return { clean, facts: [] };

    try {
        const parsed = JSON.parse(match[1]);
        if (!Array.isArray(parsed)) return { clean, facts: [] };
        const facts = parsed.filter(
            (f) =>
                typeof f?.item === "string" &&
                typeof f?.value === "string" &&
                typeof f?.source_url === "string"
        );
        return { clean, facts };
    } catch {
        return { clean, facts: [] };
    }
}