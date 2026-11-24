export type SearchResult = {
    title: string;
    url: string;
    publishedDate: string | null;
    text: string;
}


//search text and returns results
export async function webSearch(query: string): Promise<SearchResult[]> {
    const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
            "x-api-key": process.env.EXA_API_KEY ?? "",
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            query,
            numResults: 3,
            contents: { text: { maxCharacters: 1000 } },
         }),
    });
    if (!res.ok) throw new Error(`Exa error ${res.status}`);
    const data = await res.json();
    return (data.results ?? []).map((r: any) => ({
        title: r.title ?? "",
        url: r.url,
        publishedDate: r.publishedDate ?? null,
        text: r.text ?? "",
    }));
} 