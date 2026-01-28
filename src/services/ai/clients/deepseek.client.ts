import OpenAI from 'openai';

export class DeepSeekClient {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }

    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });
  }

  async chat(prompt: string, systemPrompt?: string) {
    const res = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: res.choices[0]?.message.content,
      usage: res.usage,
      cost: this.estimateCost(res.usage),
    };
  }
  async stream(prompt: string, onChunk: (chunk: string) => void): Promise<any> {
    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let fullText = '';

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }

    return {
      text: fullText,
    };
  }
  private estimateCost(usage?: any) {
    if (!usage?.total_tokens) return 0;
    // Example pricing – adjust when needed
    return (usage.total_tokens / 1_000) * 0.002;
  }
}
