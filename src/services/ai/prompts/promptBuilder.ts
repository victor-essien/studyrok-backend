// src/services/prompt-builder.service.ts
/**
 * Prompt Builder with strict formatting instructions for Gemini
 */

export class PromptBuilderService {
  /**
   * Build main topic prompt with strict formatting rules
   */
  public buildMainPrompt(
    topic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    includeExamples: boolean
  ): string {
    const examplesInstruction = includeExamples
      ? 'Include practical examples and real-world applications.'
      : 'Focus on concepts without detailed examples.';

    return `You are a technical writer creating study notes in Markdown format.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}
INSTRUCTION: ${examplesInstruction}

CRITICAL OUTPUT RULES (FOLLOW EXACTLY):
1. Output ONLY plain markdown text - NO code fences, NO preamble, NO explanations
2. Start immediately with the # heading
3. Use HYPHENS (-) for ALL bullet points - NEVER use asterisks (*)
4. Use actual line breaks - the Enter key creates \n, not the text "\\n"
5. For line breaks use <br>
6. Headers format: # space text (e.g., "# Introduction")
7. Bold format: **word** with NO spaces inside the asterisks but a space after the last asterixs
8. Horizontal rules: three hyphens --- on their own line with blank lines before/after
9. Lists must have blank line before them

STRUCTURE YOUR NOTES EXACTLY LIKE THIS:

# ${topic}

*Brief one-line description of the topic*

This is an introduction paragraph that explains what the topic covers and why it matters.

## First Main Section

This section introduces the first major concept with 2-3 paragraphs of explanation.

### Subsection 1.1

Detailed explanation of this subsection.

- First key point
- Second key point  
- Third key point

**Example:** If including examples, format them like this with clear labels.

---

## Second Main Section

Continue with more sections...

---

## Key Takeaways

- Most important point 1
- Most important point 2
- Most important point 3
- Most important point 4

NOW WRITE THE NOTES:`;
  }

  /**
   * Build subtopic prompt
   */
  public buildSubtopicPrompt(
    mainTopic: string,
    subtopic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    includeExamples: boolean
  ): string {
    const examplesInstruction = includeExamples
      ? 'Include a practical example.'
      : 'Focus on core concepts only.';

    return `You are writing ONE SECTION of study notes about "${subtopic}" as part of "${mainTopic}".

DIFFICULTY: ${difficulty}
INSTRUCTION: ${examplesInstruction}

OUTPUT RULES (CRITICAL):
1. Start with ## ${subtopic}
2. Write 2-4 paragraphs explaining this subtopic
3. Break into ### subsections if needed
4. Use HYPHENS (-) for bullet points, NEVER asterisks (*)
5. Use **text** for bold (NO spaces inside asterisks)
6. Output ONLY the markdown section - NO code fences, NO extra text

WRITE THE SECTION NOW:`;
  }

  /**
   * Build topic analysis prompt for complexity detection
   */
  public buildAnalysisPrompt(topic: string): string {
    return `Analyze this topic: "${topic}"

Determine if this topic is:
- SIMPLE: Can be covered in one comprehensive section (return ["${topic}"])
- COMPLEX: Needs multiple major sections (return 3-5 subtopic names as array)

Rules:
- Return ONLY a JSON array of strings
- NO markdown formatting, NO code fences, NO explanations
- Just the array: ["Topic 1", "Topic 2", "Topic 3"]

Examples:
Input: "What is DNA?"
Output: ["What is DNA?"]

Input: "Computer Networks"  
Output: ["Network Fundamentals", "Network Protocols", "Network Security", "Network Architecture"]

Analyze and respond with JSON array only:`;
  }

  /**
   * Get formatting examples for common mistakes
   */
  public getFormattingExamples(): string {
    return `
CORRECT MARKDOWN EXAMPLES:

Headers:
# Main Heading
## Section Heading
### Subsection

Bullet Lists (use hyphens):
- First point
- Second point
- Third point

Numbered Lists:
1. First item
2. Second item
3. Third item

Bold and Italic:
**bold text**
*italic text*
**bold and *italic***

Horizontal Rule:
---

Code Inline:
Use \`code\` for inline code

Code Block:
\`\`\`python
print("hello")
\`\`\`

INCORRECT (DO NOT USE):
* Bullet with asterisk
#Header without space
** bold with spaces inside **
---\n\n (literal \\n instead of line breaks)
`;
  }
}
