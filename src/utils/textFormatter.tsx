import React from 'react';

/**
 * Parses markdown bold (**word**), headers, and bullet points into React elements
 * without displaying raw asterisks in the UI.
 */
export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return null;

  // Split lines
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Check if line is a header like ###
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      return (
        <div key={lineIdx} className="font-extrabold text-slate-900 my-1 text-sm sm:text-base">
          {parseInlineFormatting(headerMatch[2])}
        </div>
      );
    }

    // Check if line is a bullet item like * or -
    const bulletMatch = line.match(/^(\*|-|•)\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-0.5 pr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00873D] mt-2 shrink-0" />
          <span className="flex-1">{parseInlineFormatting(bulletMatch[2])}</span>
        </div>
      );
    }

    // Normal line
    return (
      <React.Fragment key={lineIdx}>
        {parseInlineFormatting(line)}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function parseInlineFormatting(str: string): React.ReactNode[] {
  if (!str) return [];

  // Match bold with ***, **, or single * (when wrapping words) or __
  const parts: React.ReactNode[] = [];
  // Tokenize regex for ***bold-italic***, **bold**, *emphasis/bold*, or __bold__
  const pattern = /(\*{3}([^*]+?)\*{3})|(\*{2}([^*]+?)\*{2})|(\*([^*\s][^*]*?[^*\s]|\S)\*)|(_{2}([^_]+?)_{2})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // ***text***
      parts.push(
        <strong key={`bi-${match.index}`} className="font-black text-slate-950">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // **text**
      parts.push(
        <strong key={`b-${match.index}`} className="font-extrabold text-slate-950">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      // *text*
      parts.push(
        <strong key={`i-${match.index}`} className="font-bold text-slate-900">
          {match[6]}
        </strong>
      );
    } else if (match[7]) {
      // __text__
      parts.push(
        <strong key={`u-${match.index}`} className="font-extrabold text-slate-950">
          {match[8]}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts;
}
