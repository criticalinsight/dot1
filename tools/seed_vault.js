const articles = [
    { category: "Return on Capital", title: "Importance of ROIC Part 1: Compounders and Cheap Stocks" },
    { category: "Return on Capital", title: "Importance of ROIC Part 2: Compounders and Cheap Stocks" },
    { category: "Return on Capital", title: "Importance of ROIC Part 3: Compounding and Reinvestment" },
    { category: "Return on Capital", title: "Importance of ROIC Part 4: The Math of Compounding" },
    { category: "Return on Capital", title: "Importance of ROIC Part 5: A Glance at the Last 42 Years of Wells Fargo" },
    { category: "Return on Capital", title: "Importance of ROIC: “Reinvestment” vs. “Legacy” Moats" },
    { category: "Return on Capital", title: "Calculating the Return on Incremental Capital Investments" },
    { category: "Company Writeups", title: "14% FCF Yield + Undervalued Real Estate (MCS)" },
    { category: "Company Writeups", title: "Hospital Owner at a 14% FCF Yield (DR.TO)" },
    { category: "Company Writeups", title: "Valuation Update (FCNCA)" },
    { category: "Company Writeups", title: "Value Investors Bank (FCNCA)" },
    { category: "Company Writeups", title: "NRP’s Evolution and Future Distribution Potential (NRP)" },
    { category: "Company Writeups", title: "“Royalty on the Growth of Others” at a 27% FCF Yield (NRP)" },
    { category: "Company Writeups", title: "Tencent Presentation (TCEHY)" },
    { category: "Company Writeups", title: "Berkshire Hathaway is Safe and Cheap (BRK)" },
    { category: "Company Writeups", title: "Apple’s Key Competitive Advantage (AAPL)" },
    { category: "Company Writeups", title: "Bank Stock Review (JPM, BAC)" },
    { category: "Company Writeups", title: "Verisign: The Toll Road of the Internet (VRSN)" },
    { category: "Company Writeups", title: "Markel: A Compounding Machine (MKL)" },
    { category: "Company Writeups", title: "Some Thoughts on Markel’s Intrinsic Value (MKL)" },
    { category: "Company Writeups", title: "Facebook is Undervalued (11/30/18)" },
    { category: "Company Writeups", title: "10 Years of Google and the Importance of Long Term Thinking (GOOGL)" },
    { category: "Company Writeups", title: "An Exercise on Thinking Differently and a Great Business (AMZN)" },
    { category: "Company Writeups", title: "Thoughts on Fastenal (FAST)" },
    { category: "Company Writeups", title: "Associated Capital: A True $1.00 for $0.70 (AC)" },
    { category: "Company Writeups", title: "Apple vs. Exxon Mobil (AAPL)" },
    { category: "Company Writeups", title: "Notes on Credit Acceptance Corp (CACC)" },
    { category: "Investment Strategy", title: "Risk of Outsourced Thinking" },
    { category: "Investment Strategy", title: "Attributes of a Great Business and a Simple Checklist" },
    { category: "Investment Strategy", title: "Thoughts on Ben Graham’s “Unpopular Large Caps”" },
    { category: "Investment Strategy", title: "Competitive Advantage of an Owner-Operator" },
    { category: "Investment Strategy", title: "The Simple Concept of Intrinsic Value" },
    { category: "Investment Strategy", title: "A Few Thoughts on Reducing Unforced Errors" },
    { category: "Investment Strategy", title: "The Importance of Pricing Power" },
    { category: "Edge", title: "What is Your Edge?" },
    { category: "Edge", title: "The Edge in Having No Career Risk" },
    { category: "Edge", title: "Black Edge" },
    { category: "Edge", title: "The Coffee Can Edge" },
    { category: "Edge", title: "Charlie Munger Meeting Takeaways and Comments on Edge" },
    { category: "Case Studies", title: "Buffett’s 44% CAGR in Japan and High Quality Investments" },
    { category: "Case Studies", title: "Lessons From the Fall of SunEdison" },
    { category: "Case Studies", title: "Valeant and the Too Hard Pile" },
    { category: "Case Studies", title: "Buffett’s Letter to See’s Candies in 1972" },
    { category: "Case Studies", title: "Importance of Knowing Your Investment Boundaries" },
    { category: "Case Studies", title: "Buffett Thoughts on GEICO in 1976" },
    { category: "Buffett & Munger", title: "How Buffett Made 50% Per Year? By Thinking Differently…" },
    { category: "Buffett & Munger", title: "Things You Didn’t Know About Buffett’s Strategy" },
    { category: "Buffett & Munger", title: "Buffett on How to Think About Stocks" },
    { category: "Buffett & Munger", title: "Michael Burry: Focus on Bargains" },
    { category: "Buffett & Munger", title: "The 400% Man-A Lesson for Aspiring Investors" },
    { category: "Buffett & Munger", title: "Think Differently to Achieve Different Results (Mohnish Pabrai)" },
    { category: "Buffett & Munger", title: "Buffett’s Investment in Dempster Mill – A Cigar Butt" },
    { category: "Misc", title: "Market Truisms and Quarterback Controversies" },
    { category: "Misc", title: "Macroeconomics & NBA Free Agency" },
    { category: "Misc", title: "Best Way to Improve Investment Skills: One Case Study After Another" }
];

async function seed() {
    const BACKEND = 'https://dot1-backend.iamkingori.workers.dev';

    for (const article of articles) {
        const task = {
            id: `art-${Math.random().toString(36).substr(2, 9)}`,
            projectId: 'lipa-master',
            title: article.title,
            prompt: `Act as a wealth management philosopher. Author a haiku (5-7-5) and a 1-sentence sharp investment insight for the article: "${article.title}". Category: ${article.category}. Format: HAIKU | INSIGHT | STYLE_PROMPT (for a minimalist high-fidelity macro background image).`,
            status: 'queued',
            tags: [article.category.toLowerCase().replace(/\s+/g, '-'), 'insight'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log(`Seeding: ${article.title}`);
        try {
            const res = await fetch(`${BACKEND}/task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            console.log(`Result: ${res.status}`);
        } catch (e) {
            console.error(`Failed ${article.title}: ${e.message}`);
        }
    }
}

seed();
