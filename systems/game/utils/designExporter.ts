
export const generateDesignBible = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `# The Pawn's Dilemma - Game Design Document (GDD)
**Generated Date:** ${timestamp}
**Version:** 4.0 (Master Design Spec)

[...Content Omitted for Brevity, assuming standard bible structure...]
*End of Game Design Document*
`;
};
