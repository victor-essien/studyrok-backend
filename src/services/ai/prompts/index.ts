/**
 * AI Prompt Templates
 * Centralized location for all AI prompts
 */

export const SYSTEM_PROMPTS = {
  NOTES: `You are an expert educational content creator specializing in creating comprehensive study notes. 
Your notes are clear, well-structured, and optimized for learning and retention.
Always use proper Markdown formatting and pedagogical best practices.`,

  FLASHCARDS: `You are an expert at creating effective flashcards for spaced repetition learning.
Your flashcards are concise, focused on one concept each, and use active recall principles.
You create questions that promote deep understanding, not just memorization.`,

  QUIZ: `You are an expert assessment designer creating educational quiz questions.
Your questions are fair, clear, and test genuine understanding of the material.
You provide helpful explanations that teach, not just validate answers.`,

  VIDEO_SCRIPT: `You are an expert educational video script writer.
Your scripts are engaging, clear, and optimized for video format with visual cues.
You understand pacing, audience engagement, and educational best practices.`,
};

export const NOTES_TEMPLATE = {
  STRUCTURE: `
# [Topic Title]

## Introduction
[Brief overview - 2-3 sentences]

## Key Concepts
- **[Concept 1]**: [Definition]
- **[Concept 2]**: [Definition]
- **[Concept 3]**: [Definition]

## Detailed Explanation
### [Subtopic 1]
[Detailed content with examples]

### [Subtopic 2]
[Detailed content with examples]

## Examples and Applications
[Real-world examples and practical applications]

## Common Misconceptions
[Address common misunderstandings]

## Summary
[Concise recap of main points - 2-3 sentences]

## Learning Objectives
By the end of this material, you should be able to:
1. [Objective 1]
2. [Objective 2]
3. [Objective 3]

## Further Reading
[Optional: Suggestions for deeper learning]
`,

  REQUIREMENTS: [
    'Use proper Markdown formatting',
    'Include clear section headings',
    'Bold important terms on first use',
    'Use bullet points for lists',
    'Include practical examples',
    'Keep language clear and accessible',
    'Ensure logical flow between sections',
  ],
};

export const FLASHCARD_TEMPLATES = {
  BASIC: {
    EXAMPLE: {
      front: 'What is photosynthesis?',
      back: 'The process by which plants convert light energy into chemical energy (glucose) using carbon dioxide and water, releasing oxygen as a byproduct.',
      hint: 'Think about what plants need from sunlight',
    },
    GUIDELINES: [
      'Ask specific, focused questions',
      'Provide complete, accurate answers',
      'Avoid yes/no questions',
      'Include context when needed',
      'Use hints to guide thinking, not give away answers',
    ],
  },

  CLOZE: {
    EXAMPLE: {
      front: 'Photosynthesis occurs in the [...] of plant cells.',
      back: 'chloroplasts',
      hint: 'This organelle is green due to chlorophyll',
    },
    GUIDELINES: [
      'Remove key term or phrase',
      'Ensure sentence still makes sense with [...]',
      'Make the missing part specific and testable',
      'Provide enough context to recall answer',
    ],
  },

  DIFFICULTY_GUIDELINES: {
    easy: 'Basic definitions, simple facts, direct recall',
    medium: 'Concepts requiring understanding, relationships between ideas',
    hard: 'Complex applications, synthesis of multiple concepts, critical thinking',
  },
};

export const QUIZ_TEMPLATES = {
  MULTIPLE_CHOICE: {
    EXAMPLE: {
      question: 'Which organelle is primarily responsible for photosynthesis in plant cells?',
      options: [
        'Mitochondria',
        'Chloroplasts',
        'Nucleus',
        'Golgi apparatus',
      ],
      correctAnswer: 'Chloroplasts',
      explanation: 'Chloroplasts contain chlorophyll and are the site where photosynthesis occurs. Mitochondria are responsible for cellular respiration.',
    },
    GUIDELINES: [
      'Create one clear correct answer',
      'Make distractors plausible but clearly wrong',
      'Avoid "all of the above" or "none of the above"',
      'Keep options similar in length and format',
      'Ensure only one defensible correct answer',
    ],
  },

  TRUE_FALSE: {
    EXAMPLE: {
      question: 'Photosynthesis and cellular respiration are opposite processes.',
      correctAnswer: 'True',
      explanation: 'Photosynthesis converts CO₂ and H₂O into glucose and O₂, while cellular respiration does the reverse, converting glucose and O₂ into CO₂ and H₂O.',
    },
    GUIDELINES: [
      'Make statements absolutely true or false',
      'Avoid ambiguous wording',
      'Include explanation to teach the concept',
      'Test important concepts, not trivial details',
    ],
  },

  SHORT_ANSWER: {
    EXAMPLE: {
      question: 'Explain the role of chlorophyll in photosynthesis.',
      correctAnswer: 'Chlorophyll absorbs light energy, primarily from the blue and red wavelengths, and converts it into chemical energy. This energy is used to drive the reactions that produce glucose from carbon dioxide and water.',
      hint: 'Think about what happens when light hits chlorophyll',
    },
    GUIDELINES: [
      'Ask for explanation, not just facts',
      'Specify expected length (1-3 sentences)',
      'Provide clear grading criteria',
      'Focus on understanding over memorization',
    ],
  },
};

export const VIDEO_SCRIPT_TEMPLATE = {
  STRUCTURE: `
[HOOK - 0:00-0:10]
[Attention-grabbing opening]

[INTRODUCTION - 0:10-0:30]
"In this video, we'll explore [topic]..."
[VISUAL: Show title card]

[MAIN CONTENT - 0:30-2:00]
[Point 1]
[VISUAL: Diagram/animation]

[Point 2]
[VISUAL: Example/demonstration]

[Point 3]
[VISUAL: Real-world application]

[EXAMPLES - 2:00-2:30]
[Practical examples or applications]
[VISUAL: Show examples]

[SUMMARY - 2:30-2:50]
"Let's recap the key points..."
[VISUAL: Bullet points appear]

[CALL TO ACTION - 2:50-3:00]
"Now it's your turn to..."
`,

  STYLE_GUIDES: {
    educational: {
      tone: 'Clear, structured, and pedagogical',
      pace: 'Moderate, allowing time to absorb concepts',
      language: 'Precise terminology with explanations',
      examples: 'Academic and illustrative',
    },
    casual: {
      tone: 'Conversational and friendly',
      pace: 'Dynamic and engaging',
      language: 'Simple, relatable terms',
      examples: 'Everyday situations and analogies',
    },
    professional: {
      tone: 'Authoritative and polished',
      pace: 'Steady and confident',
      language: 'Industry-standard terminology',
      examples: 'Business and professional contexts',
    },
  },

  VISUAL_CUES: [
    '[VISUAL: Show diagram]',
    '[VISUAL: Highlight key term]',
    '[VISUAL: Animation of process]',
    '[VISUAL: Side-by-side comparison]',
    '[VISUAL: Real-world example]',
    '[VISUAL: Text appears on screen]',
    '[VISUAL: Transition to next section]',
  ],
};

export const RESPONSE_FORMATS = {
  NOTES: {
    description: 'Return pure Markdown without code blocks',
    example: '# Topic\n\n## Section\n\nContent...',
  },

  FLASHCARDS: {
    description: 'Return JSON array only, no markdown or code blocks',
    example: '[{"front":"Q","back":"A","hint":"H"}]',
  },

  QUIZ: {
    description: 'Return JSON array only, no markdown or code blocks',
    example: '[{"questionType":"multiple-choice","question":"Q","options":[],"correctAnswer":"A"}]',
  },

  VIDEO_SCRIPT: {
    description: 'Return JSON object only, no markdown or code blocks',
    example: '{"title":"T","description":"D","script":"S","keyPoints":[]}',
  },
};

export const QUALITY_GUIDELINES = {
  NOTES: [
    'Clear progression from simple to complex',
    'Include practical examples',
    'Address common misconceptions',
    'Use analogies for difficult concepts',
    'Ensure consistency in terminology',
    'Proper citation of specific facts',
  ],

  FLASHCARDS: [
    'One concept per card',
    'Use active voice',
    'Avoid ambiguous wording',
    'Include context when needed',
    'Make questions specific',
    'Test understanding, not just recall',
  ],

  QUIZ: [
    'Test genuine understanding',
    'Avoid trick questions',
    'Provide meaningful distractors',
    'Include helpful explanations',
    'Vary question difficulty',
    'Cover different aspects of material',
  ],

  VIDEO_SCRIPT: [
    'Strong opening hook',
    'Clear structure and pacing',
    'Visual descriptions throughout',
    'Engagement techniques',
    'Memorable closing',
    'Call to action',
  ],
};