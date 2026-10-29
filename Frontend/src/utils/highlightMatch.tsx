import React from 'react';

/**
 * Highlights matches of query within text
 */
export const highlightMatch = (text: string | null | undefined, query: string): React.ReactNode => {
    if (!text) return '-';
    if (!query || !query.trim()) return text;

    const trimmedQuery = query.trim();
    // Escape special regex characters
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    const parts = text.split(regex);
    if (parts.length <= 1) return text;

    return (
        <span>
            {parts.map((part, index) => 
                regex.test(part) ? (
                    <mark key={index} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-sm">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};
