import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Inworld LLM Router — OpenAI-compatible, Bearer auth
const inworldLLM = new OpenAI({
  apiKey: process.env.INWORLD_API_KEY,
  baseURL: 'https://api.inworld.ai/v1'
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Niche system personas ────────────────────────────────────────────────────
// Short identity description per niche — no examples, no rules, just vibe.

const NICHE_PERSONAS = {
  funny:        `You are a raw, unfiltered comedy writer. You write scripts that are hilarious, chaotic, and feel like real shit that actually happened — not a punchline setup. Uncensored. Hood voice. Real emotions. Return ONLY valid JSON.`,
  scary:        `You are a raw horror writer. You write scripts that are viscerally disturbing, hyper-specific, and feel like a personal account of something that really happened. No clichés, no jump-scare tropes. Return ONLY valid JSON.`,
  motivational: `You are a no-bullshit motivational writer. Brutal tough love. You call people out directly with zero patience for excuses. Feels like a real conversation with someone who genuinely gives a damn. Return ONLY valid JSON.`,
  fitness:      `You are a raw fitness writer. You expose the exact real reasons people aren't getting results — no filler, no generic advice. Painfully specific and honest. Return ONLY valid JSON.`,
  finance:      `You are a raw finance writer. You react to real money mistakes people make like it personally offended you. Real numbers, real situations, zero lecture. Return ONLY valid JSON.`,
  funfacts:     `You are a chaotic fact writer. You react to insane true facts like they just ruined your day. Your reaction and disbelief IS the content. Return ONLY valid JSON.`,
  lifehacks:    `You are a frustrated life hack writer. Low-key offended that nobody told you this sooner. Personal, specific, genuinely useful. Return ONLY valid JSON.`,
  science:      `You are a 3am Wikipedia rabbit-hole writer. Mind-blown and personally offended by how wild the universe is. Return ONLY valid JSON.`,
  history:      `You are a raw history writer. You react to historical insanity like it just happened — chaotic, disbelieving, personal. Return ONLY valid JSON.`,
  default:      `You are a raw, unfiltered video script writer. Write something real, specific, and engaging. Return ONLY valid JSON.`,
};

function buildPersona(niche, tone) {
  const key = niche?.toLowerCase().replace(/\s+/g, '') || 'default';
  if (tone?.toLowerCase().includes('funny') || tone?.toLowerCase().includes('comedy')) {
    return NICHE_PERSONAS.funny;
  }
  return NICHE_PERSONAS[key] || NICHE_PERSONAS.default;
}

// Kept for backward compatibility with scheduler.js — no longer injects constraints
export function buildCreativeConstraint() {
  return '';
}

/**
 * Generate a viral video script using Hermes 3 via Inworld LLM Router
 */
export async function generateScript({ topic, niche, tone = 'energetic', duration = 60, style = '', scenarioHint = '' }) {
  const targetWords = Math.round((duration / 60) * 160);
  const minSegments = Math.round(targetWords / 10);
  const wordsPerSegment = Math.round(targetWords / minSegments);
  const minWordsPerSeg = Math.max(5, wordsPerSegment - 2);
  const maxWordsPerSeg = wordsPerSegment + 3;

  // Extract any "Mention AT THE END:" instruction from the topic
  const ctaMatch = topic.match(/mention\s+at\s+the\s+end\s*:\s*(.+)/i);
  const customCTA = ctaMatch ? ctaMatch[1].trim() : null;
  const cleanTopic = topic.replace(/mention\s+at\s+the\s+end\s*:.+/i, '').trim();

  const prompt = `Create a ${duration}-second video dialogue script.

TOPIC: ${cleanTopic}
NICHE: ${niche}
TONE: ${tone}
${customCTA ? `CALL TO ACTION — use this EXACT text as the callToAction field: "${customCTA}"` : ''}
${scenarioHint ? `SCENARIO CONTEXT: ${scenarioHint}` : ''}

You have full creative freedom. Invent the scene, setting, characters, and story yourself based on the topic. Make it specific, vivid, and surprising — not generic.

━━━ FORMAT: DIALOGUE BETWEEN TWO PEOPLE ━━━
Speaker A and Speaker B talk to each other. They REACT to each other — not co-narrate.
- A says something → B responds DIRECTLY to what A just said
- B makes a point → A reacts TO that specific thing
- They interrupt, clown on each other, make things worse for each other
- Feels like two real people in a voice note or on the phone, not a scripted show

━━━ WORD COUNT ━━━
Total: ${targetWords} words (hook + all segments + callToAction combined)
Segments: exactly ${minSegments}, each ${minWordsPerSeg}–${maxWordsPerSeg} words
Dialogue is punchy. Short reactive lines. Count before you write the next one.

━━━ TTS DELIVERY ━━━
- Use *single asterisks* on 1–2 punch words per segment
- Add [laugh], [sigh], [breathe], [cough], [clear_throat] vocalizations — 3 to 5 spread across both speakers
- Use ... for pauses that let things sink in
- Numbers as words: "fifteen hundred dollars" not "$1,500"

━━━ OUTPUT: JSON ONLY ━━━
{
  "title": "short punchy title",
  "hook": "FIRST THREE WORDS ALL CAPS then the rest of the hook — always Speaker A",
  "characterDescriptionA": "one vivid sentence describing Character A: age, look, energy, outfit — be specific and original",
  "characterDescriptionB": "one vivid sentence describing Character B: age, look, energy, outfit — be specific and original",
  "segments": [
    {
      "speaker": "A",
      "text": "what A says — ${minWordsPerSeg} to ${maxWordsPerSeg} words",
      "imagePrompt": "start with characterDescriptionA word for word, then describe the scene matching the narration, end with: ${style || 'cinematic photorealistic'}",
      "duration": estimated_seconds
    },
    {
      "speaker": "B",
      "text": "B's direct reaction to what A just said — ${minWordsPerSeg} to ${maxWordsPerSeg} words",
      "imagePrompt": "start with characterDescriptionB word for word, then describe the scene matching the narration, end with: ${style || 'cinematic photorealistic'}",
      "duration": estimated_seconds
    }
  ],
  "callToAction": "${customCTA || 'go to reelswave.com'}",
  "hashtags": ["3 to 5 relevant tags"]
}

No text, watermarks, or subtitles in image prompts. Alternate speakers A/B/A/B strictly.`;

  const systemPersona = buildPersona(niche, tone);

  const response = await inworldLLM.chat.completions.create({
    model: 'hermes-3-llama-3-1-70b',
    messages: [
      { role: 'system', content: systemPersona },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.95,
    max_tokens: 8192
  });

  let scriptText = response.choices[0].message.content;

  // Strip any text Hermes prepends before the JSON
  const jsonStart = scriptText.indexOf('{');
  const jsonEnd = scriptText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    scriptText = scriptText.slice(jsonStart, jsonEnd + 1);
  }

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

  const provider = (process.env.VOICE_PROVIDER || 'elevenlabs').toLowerCase();

  // Strip emojis
  const noEmoji = fullScript
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/_/g, '')
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanScript;
  if (provider === 'inworld') {
    cleanScript = noEmoji
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[-—]/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    cleanScript = noEmoji
      .replace(/\*\*/g, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\.{2,}/g, ',')
      .replace(/[-—]/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    ...script,
    fullScript,
    cleanScript,
    wordCount: fullScript.split(' ').length,
    estimatedDuration: Math.round(fullScript.split(' ').length / 2.5)
  };
}
