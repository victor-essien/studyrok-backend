
// Markdown cleaner to fix all common Gemini markdown output issues



export class MarkdownCleanerService {

    public cleanMarkdown(text: string): string {
        let cleaned = text;

        cleaned = this.removeCodeFences(cleaned);

        cleaned = this.fixEscapedCharacters(cleaned);

        cleaned = this.fixListFormatting(cleaned);

        cleaned = this.fixHorizontalRules(cleaned);

        cleaned = this.fixHeaders(cleaned);

        cleaned = this.fixEmphasis(cleaned);

        cleaned = this.cleanWhitespace(cleaned);

        cleaned = this.fixBrokenPatterns(cleaned);

        cleaned = this.finalNormalization(cleaned);


        return cleaned.trim();
    }

    private removeCodeFences(text: string): string {
    // Remove markdown/md code fences
    text = text.replace(/```markdown\s*\n?/gi, '');
    text = text.replace(/```md\s*\n?/gi, '');
    text = text.replace(/```\s*$/gm, '');
    text = text.replace(/^```\s*\n?/gm, '');
    return text;
  }

  private fixEscapedCharacters(text: string): string {
    // Fix literal \n to actual newlines
    text = text.replace(/\\n/g, '\n');
    
    // Fix literal \t to spaces
    text = text.replace(/\\t/g, '    ');
    
    // Fix escaped asterisks that should be literal
    text = text.replace(/\\\*/g, '*');
    
    // Fix escaped underscores
    text = text.replace(/\\_/g, '_');
    
    // Fix escaped hashes
    text = text.replace(/\\#/g, '#');
    
    return text;
  }

  private fixListFormatting(text: string): string {
    // Convert standalone asterisks to hyphens for bullets
    text = text.replace(/^\* /gm, '- ');
    text = text.replace(/\n\* /g, '\n- ');
    
    // Fix malformed bullets like "- **O" or "\n -**O"
    text = text.replace(/^[\s\n]*-\s*\*\*([A-Z])/gm, '- **$1');
    
    // Fix bullets that lost their space
    text = text.replace(/^-([^\s-])/gm, '- $1');
    
    // Fix nested lists
    text = text.replace(/^  \* /gm, '  - ');
    text = text.replace(/^    \* /gm, '    - ');
    
    // Remove orphaned list markers
    text = text.replace(/^\s*[-*]\s*$/gm, '');
    
    return text;
  }

  private fixHorizontalRules(text: string): string {
    // Fix various broken horizontal rule patterns
    // Fix patterns like "s\n\n---\n\n##"
    text = text.replace(/([a-z])\s*\\n\\n---\\n\\n/gi, '$1\n\n---\n\n');
    
    // Normalize all horizontal rules to ---
    text = text.replace(/^[_*-]{3,}\s*$/gm, '---');
    
    // Ensure proper spacing around horizontal rules
    text = text.replace(/([^\n])\n---\n/g, '$1\n\n---\n\n');
    text = text.replace(/\n---\n([^\n])/g, '\n\n---\n\n$1');
    
    // Remove horizontal rules that are too close together
    text = text.replace(/---\n\n---/g, '---');
    
    return text;
  }

  private fixHeaders(text: string): string {
    // Fix headers with improper spacing
    text = text.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
    
    // Fix broken headers like "## Int" (incomplete)
    // Ensure there's content after the header
    text = text.replace(/^(#{1,6}\s+)([A-Z][a-z]{0,3})\s*$/gm, (match, hashes, word) => {
      // If word is too short and likely cut off, try to preserve it
      if (word.length < 4) {
        return match; // Keep as is, might be intentional
      }
      return match;
    });
    
    // Remove headers with no content
    text = text.replace(/^#{1,6}\s*$/gm, '');
    
    // Ensure newline after headers
    text = text.replace(/^(#{1,6}\s+.+)$/gm, '$1\n');
    
    return text;
  }

  private fixEmphasis(text: string): string {
    // Fix broken bold markers
    text = text.replace(/\*\*\s+/g, '**');
    text = text.replace(/\s+\*\*/g, '**');
    
    // Fix broken italic markers
    text = text.replace(/\*\s+([^\*]+)\s+\*/g, '*$1*');
    
    // Fix orphaned emphasis markers
    text = text.replace(/\*\*([^*\n]+)\n/g, '**$1**\n');
    
    // Fix patterns like "\n -**O" where emphasis is broken
    text = text.replace(/\*\*([A-Z])(?=[a-z])/g, '**$1');
    
    return text;
  }

  private cleanWhitespace(text: string): string {
    // Fix multiple spaces
    text = text.replace(/ {3,}/g, '  ');
    
    // Fix tabs
    text = text.replace(/\t/g, '    ');
    
    // Remove trailing whitespace from lines
    text = text.replace(/[ \t]+$/gm, '');
    
    // Fix excessive blank lines (more than 2)
    text = text.replace(/\n{4,}/g, '\n\n\n');
    
    // Fix spaces before newlines
    text = text.replace(/ +\n/g, '\n');
    
    return text;
  }

  private fixBrokenPatterns(text: string): string {
    // Fix patterns like "word\n\n---" where text runs into formatting
    text = text.replace(/([a-z0-9])(\\n\\n)---/gi, '$1\n\n---');
    
    // Fix incomplete sentences followed by headers
    text = text.replace(/([a-z,])\n(#{1,6}\s)/g, '$1.\n\n$2');
    
    // Fix list items that run together
    text = text.replace(/([a-z0-9])\n-\s/g, '$1\n\n- ');
    
    // Fix code blocks with broken formatting
    text = text.replace(/```\s*\n\s*\n/g, '```\n');
    text = text.replace(/\n\s*\n\s*```/g, '\n```');
    
    return text;
  }

  private finalNormalization(text: string): string {
    // Ensure single blank line between paragraphs and headers
    text = text.replace(/\n\n+/g, '\n\n');
    
    // Ensure headers have space before them (except first line)
    text = text.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');
    
    // Ensure lists have proper spacing
    text = text.replace(/([^\n])\n(-\s)/g, '$1\n\n$2');
    
    // Remove any remaining literal \n sequences
    text = text.replace(/\\n/g, '\n');
    
    // Final trim of each line
    text = text.split('\n').map(line => line.trimEnd()).join('\n');
    
    return text;
  }

  /**
   * Validate markdown structure and log issues
   */
  public validateMarkdown(text: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for literal \n
    if (text.includes('\\n')) {
      issues.push('Contains literal \\n characters');
    }

    // Check for malformed headers
    const malformedHeaders = text.match(/^#{1,6}[^\s]/gm);
    if (malformedHeaders) {
      issues.push(`Found ${malformedHeaders.length} malformed headers`);
    }

    // Check for broken emphasis
    const brokenBold = text.match(/\*\*\s+\w|\w\s+\*\*/g);
    if (brokenBold) {
      issues.push(`Found ${brokenBold.length} broken bold markers`);
    }

    // Check for orphaned list markers
    const orphanedMarkers = text.match(/^[-*]\s*$/gm);
    if (orphanedMarkers) {
      issues.push(`Found ${orphanedMarkers.length} orphaned list markers`);
    }

    // Check for excessive blank lines
    if (text.includes('\n\n\n\n')) {
      issues.push('Contains excessive blank lines');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  

}