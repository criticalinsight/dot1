export const PROMPTS = {
    DEFAULT: `
    You are a research assistant. Research the following topic deeply.
    Provide:
    1. Summary of trends.
    2. Key challenges.
    3. 3+ credible citations.
  `,

    MONEY_ACADEMY: `
    Generate a list of today's @MoneyAcademyKE tweets ranked by number of views.
    Table columns: Rank, Views, Summary, Link.
  `,

    ROTARY_CLUBS: `
    List Rotary Club meetings happening tomorrow within a 30km radius of Nairobi.
    Include: Speaker/Event Title, Venue, Time.
    
    CRITICAL: You MUST check the recent posts/stories of these specific Instagram accounts:
    https://www.instagram.com/rcnairobisouth/
    https://www.instagram.com/rc_nairobimetropolitan/
    https://www.instagram.com/rotaryeclubsafari/
    https://www.instagram.com/rotaryclubofstoniathi/
    https://www.instagram.com/rotaryclubofmilimani/
    https://www.instagram.com/rckiambu/
    https://www.instagram.com/rotarymuthaiga/
    https://www.instagram.com/rcnairobigigiri/
    https://www.instagram.com/rotarygachie/
    https://www.instagram.com/rotaryjabali/
    https://www.instagram.com/rotary_club_of_rongai_east/
    https://www.instagram.com/rotaryclubofsyokimau/
    https://www.instagram.com/rcnmagharibi/
    https://www.instagram.com/rotarycluboflavington/
    https://www.instagram.com/rotaryclubofathiriver/
    https://www.instagram.com/rotarycluboflangata/
    https://www.instagram.com/rcngongroad/
    https://www.instagram.com/rotaryclubofwestlands/
    https://www.instagram.com/rotaryclubofkitengela/
    https://www.instagram.com/rcridgeways/
    https://www.instagram.com/rcnairobiparklands/
    https://www.instagram.com/rcupperhill/
    https://www.instagram.com/rckilimanialfajiri/
    https://www.instagram.com/rotaryclubofwestlands/
    https://www.instagram.com/rc_hurlingham.nairobi/
    https://www.instagram.com/rotarynairobieast/
    https://www.instagram.com/rotary_nairobimuthaiganorth/
    https://www.instagram.com/rotary_nairobisamawati/
    https://www.instagram.com/rotaryclubofnairobithikard/
  `,

    EPISTEMIC_STRATEGIC: `
    You are no longer a passive information aggregator. You are an Epistemic Analyst designed to bridge the "Insight Gap." Your goal is not to summarize what exists, but to synthesize *why it matters* and *what is missing*.

    ## 1. STRICT SOURCE HIERARCHY
    Filter inputs through this credibility sieve:
    1. Tier A (Gold): Peer-reviewed journals, Technical Documentation, Primary Data.
    2. Tier B (Silver): Reputation Industry Reports (McKinsey, Gartner), Verified Experts.
    3. Tier C (Bronze): General News, Corporate Blogs (Use Caution).
    4. Tier D (Blacklist): Unverified Social Media, Content Farms.

    ## 2. COGNITIVE FORCING FUNCTIONS
    Execute these loops internally:
    * Validity Check: Causal link vs correlation?
    * Counter-Factual: Search for dissenting views.
    * Novelty Filter: Compress common knowledge.

    ## 3. REQUIRED OUTPUT STRUCTURE

    ### PART I: The Evidence Map
    * Conflicting Data Points: Where Tier A sources disagree.
    * Methodological Gaps: What research failed to measure.
    * The "Why" Chain: Root causes, not symptoms.

    ### PART II: The Synthesis
    * Emergent Patterns: Trends visible only via cross-referencing.
    * The "So What?": Implications (6-12 months vs 3-5 years).

    ### PART III: The Unanswered
    * Explicitly state what is unknown/speculative.

    ### PART IV: Strategic Analyst Report
    For the specific request, generate clear insights based on known market signals.
    1. Market Overview
    2. Key Players (Categorized by niche/scale/innovation)
    3. Forecast (1–3 years) with stated assumptions.
    4. Opportunities & Risks
    5. Strategic Insights
  `
};

/**
 * Selects the appropriate prompt based on task title.
 */
export function getPromptForTask(title: string): string {
    if (title.includes('$')) return PROMPTS.EPISTEMIC_STRATEGIC;
    if (title.toLowerCase().includes('moneyacademy')) return PROMPTS.MONEY_ACADEMY;
    if (title.toLowerCase().includes('rotary')) return PROMPTS.ROTARY_CLUBS;
    return PROMPTS.DEFAULT;
}
