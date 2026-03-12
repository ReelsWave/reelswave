import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a viral video script using GPT-5.4
 * @param {Object} options
 * @param {string} options.topic - The specific topic for the video
 * @param {string} options.niche - Category (motivational, scary, funfacts, lifehacks, etc.)
 * @param {string} options.tone - Voice tone (dramatic, calm, energetic, mysterious)
 * @param {number} options.duration - Target duration in seconds (60-90)
 * @returns {Object} Script with segments and search terms
 */
export async function generateScript({ topic, niche, tone = 'energetic', duration = 60, style = '', scenarioHint = '' }) {
  const targetWords = Math.round((duration / 60) * 160);
  const minSegments = Math.ceil(duration / 6); // ~6s per segment
  // Words per segment: subtract ~15 each for hook and CTA, split the rest evenly
  const wordsPerSegment = Math.round((targetWords - 30) / minSegments);
  const minWordsPerSeg = Math.max(8, wordsPerSegment - 3);
  const maxWordsPerSeg = wordsPerSegment + 4;

  // Extract any "Mention AT THE END:" instruction from the topic
  const ctaMatch = topic.match(/mention\s+at\s+the\s+end\s*:\s*(.+)/i);
  const customCTA = ctaMatch ? ctaMatch[1].trim() : null;
  const cleanTopic = topic.replace(/mention\s+at\s+the\s+end\s*:.+/i, '').trim();

  const prompt = `You are a viral short-form video scriptwriter. Create a ${duration}-second script for a faceless video.

CONTENT INSTRUCTIONS (follow these above all else):
TOPIC: ${cleanTopic}
NICHE: ${niche}
TONE: ${tone}
VISUAL_STYLE_PROMPT: ${style}
${scenarioHint ? `SCENARIO INSTRUCTION (for your internal creative use only — do NOT read this aloud or include it in the script): ${scenarioHint}` : ''}
${customCTA ? `CALL TO ACTION (use this EXACT text verbatim as the callToAction field): "${customCTA}"` : ''}

Formatting Rules:
- Follow a 'hook, story, offer' structure
- Start with a powerful HOOK that stops the scroll. CRITICAL: The FIRST 3 WORDS of the hook must work as a standalone thumbnail text — punchy, curiosity-driving, and impactful on their own (e.g. "YOU WASTED EVERYTHING", "NOBODY TELLS YOU", "THIS BROKE ME"). These 3 words will be displayed as captions on the thumbnail frame.
- WORD COUNT IS CRITICAL: The total word count of (hook + all segment texts + callToAction) MUST be exactly ${targetWords} words. This determines video length — going over makes the video too long.
- Each segment text must be ${minWordsPerSeg}–${maxWordsPerSeg} words. Use short sentences (3-5 words each) for caption display.
- You MUST include exactly ${minSegments} segments — no more, no fewer
- DO NOT use any emojis anywhere in the script
- Bold the most important, high-impact words using markdown (e.g. **bold**)
- Use ElevenLabs v3 audio emotion tags where they naturally fit the tone (e.g. [laughs], [sighs], [gasps], [clears throat], [nervous laugh], [exhales]). Use sparingly — 2-4 per script max, only where they genuinely enhance delivery
- ${customCTA ? `The callToAction field MUST be exactly: "${customCTA}"` : 'End with a strong call-to-action (the Offer)'}

Return ONLY valid JSON in this exact format:
{
  "title": "Video title for the creator's reference",
  "hook": "The attention-grabbing opening line (1-2 sentences)",
  "characterDescription": "A highly detailed, locked-in description of the main character's physical appearance, clothing, and defining traits. This MUST be identical across all frames to ensure consistency (e.g. 'A 16-year-old Dominican boy with short curly black hair, wearing a white basketball jersey with red trim, missing his entire left arm from the shoulder down').",
  "segments": [
    {
      "text": "Segment narration text (DO NOT INLUDE THE HOOK OR CALL TO ACTION HERE. This is ONLY the middle story body.)",
      "imagePrompt": "Detailed visual description. YOU MUST PREPEND THE EXACT characterDescription TO THIS FIELD so the AI knows exactly who to draw in this scene.",
      "duration": estimated_seconds_for_this_segment
    }
  ],
  "callToAction": "Closing CTA text",
  "hashtags": ["relevant", "hashtags", "for", "posting"]
}

Make the segments flow naturally. Each segment must be ${minWordsPerSeg}–${maxWordsPerSeg} words. Write exactly ${minSegments} segments. Total word count must be ${targetWords} words.
The imagePrompt MUST describe highly detailed, visually compelling scenes for an AI Image Generator. 
CRITICAL RULE FOR IMAGE PROMPTS: 
1. CONSISTENCY IS KING. You must prepend the exact same \`characterDescription\` to every single \`imagePrompt\` if the character appears in that scene. Otherwise, the AI will draw a different person every time.
2. YOU MUST APPEND THE EXACT \`VISUAL_STYLE_PROMPT\` STRING ("${style}") TO THE VERY END OF EVERY SINGLE \`imagePrompt\` IN THE JSON. This forces the image AI to draw the entire video in the user's requested aesthetic.
3. If the story involves a character with specific physical traits or disabilities (e.g., "one-legged", "missing an arm", "scars"), you MUST be extremely explicit and aggressive in the imagePrompt to force the AI generator to comply. Do not just say "a one legged boy", say "A boy with ONLY ONE LEG AND ONE EMPTY PANT LEG, missing his left leg completely, hopping on crutches, single leg visible" to prevent the image AI from defaulting to two legs.
4. The image MUST NOT contain any large title text, subtitles, memes, or overlaid text baked into the image. It should look like a clean cinematic photograph without huge text blocks, though natural environmental text (like street signs) is fine.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_completion_tokens: 16384
  });

  let scriptText = response.choices[0].message.content;

  let script;
  try {
    script = JSON.parse(scriptText);
  } catch (parseErr) {
    throw new Error(`Script JSON unparseable: ${parseErr.message}`);
  }

  // Combine all text for voiceover
  const fullScript = [
    script.hook,
    ...script.segments.map(s => s.text),
    script.callToAction
  ].join(' ');

  // Strip emojis and markdown for the Text-to-Speech engine so it doesn't mumble/stutter
  // Also strip newlines, dashes, and ellipses which ElevenLabs interprets as long unnatural pauses
  const cleanScript = fullScript
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/_/g, '')
    .replace(/[\n\r]+/g, ' ') // Remove newlines
    .replace(/\.{2,}/g, ', ') // Replace ellipses with a brief pause (comma) rather than a full stop
    .replace(/[-—]/g, ', ') // Replace dashes with a comma-pause so delivery breathes naturally
    .replace(/\s+/g, ' ')
    .trim();

  return {
    ...script,
    fullScript,
    cleanScript,
    wordCount: fullScript.split(' ').length,
    estimatedDuration: Math.round(fullScript.split(' ').length / 2.5) // ~2.5 words/sec
  };
}
