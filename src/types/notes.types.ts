


export interface GenerateTopicRequest {
    title: string;
    userId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    includeExamples?: boolean;
    maxDepth?: number
}



export interface TopicStructure {
    topicId: string;
    title: string;
    sections: SectionStructure[];
    totalNotes: number;
    estimatedTime: number;
}



export interface SectionStructure {
    sectionId: string;
    title: string;
    description: string;
    depthLevel: 'foundational' | 'intermediate' | 'advanced';
    notes: NoteStructure[];
    orderIndex: number;
}

export interface NoteStructure {
    noteId: string;
    title: string;
    content: string;
    summary: string;
    depthLevel: 'foundational' | 'intermediate' | 'advanced';
    wordCount: number;
    estimatedReadTime: number;
    orderIndex: number;
}