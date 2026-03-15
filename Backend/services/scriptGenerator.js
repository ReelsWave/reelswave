import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Creative randomization pools ────────────────────────────────────────────
// These are injected into every generation to prevent GPT from defaulting
// to its favorite 10-15 "safe" scenarios.

const SETTINGS = [
  'a DMV waiting room', 'a high school reunion', 'a packed subway car', 'an Airbnb check-in',
  'a dentist waiting room', 'a late-night laundromat', 'a job interview via Zoom', 'a first day at a new gym',
  'a neighborhood HOA meeting', 'a college dorm move-in day', 'a car dealership', 'a hospital waiting room',
  'a crowded airport gate', 'a first date at a mini-golf course', 'a department store fitting room',
  'a company all-hands Zoom call', 'a dog park', 'a college exam hall', 'a hair salon',
  'a fast food drive-through', 'a children\'s birthday party', 'a retirement party', 'a camping trip',
  'a school parent-teacher conference', 'a city bus', 'a rooftop apartment', 'a theme park queue',
  'a spin class', 'a farmers market', 'a courthouse', 'a police non-emergency line hold',
  'a pharmacy pick-up counter', 'an escape room', 'a work holiday party', 'a university library',
  'a hotel pool', 'a community garden', 'a co-working space', 'a hospital elevator',
  'a homeowners association Zoom call', 'a karaoke bar', 'a trivia night', 'an urgent care clinic',
  'a moving truck', 'a storage unit', 'a wedding rehearsal dinner', 'a book club meeting',
  'a local town hall meeting', 'a food truck festival', 'a cruise ship dining room',
];

const CHARACTERS = [
  'an overconfident intern', 'a sleep-deprived new parent', 'a recently retired teacher',
  'an overly competitive coworker', 'a college student on financial aid', 'a newly promoted manager',
  'a first-generation college student', 'someone on their first week of a diet', 'a freelancer with 3 clients',
  'someone who just got fired and doesn\'t know how to tell their spouse', 'a 30-year-old living with their parents',
  'a nurse on a double shift', 'someone learning to drive at 35', 'a person allergic to almost everything',
  'someone who just moved to a new city and knows nobody', 'an ex who keeps accidentally bumping into their ex',
  'a gym newbie in January', 'someone who lied on their résumé', 'a chronic over-apologizer',
  'a person who doesn\'t know how to say no', 'a hypochondriac Googling symptoms', 'a night-shift security guard',
  'someone who mispronounced a word for 20 years', 'a person trying to adult for the first time',
  'a work-from-home employee who forgot they had a meeting', 'an oldest sibling at a family event',
  'a 22-year-old first-time homebuyer', 'a PhD student who can\'t explain what they study',
  'someone trying to impress their partner\'s parents for the first time',
  'a person who accidentally replied-all to a company email',
];

const CONFLICTS = [
  'realizes they\'ve been calling someone the wrong name for months',
  'accidentally sends a personal text to a group chat',
  'finds out the "new hire" is actually their boss\'s kid',
  'gets caught lying about a skill on their résumé mid-task',
  'walks into the wrong room at the wrong moment',
  'gives brutally honest feedback thinking they\'re on mute',
  'accidentally becomes the center of attention in a crowd',
  'overhears a conversation they weren\'t supposed to',
  'shows up overdressed — or underdressed — for a major event',
  'realizes mid-conversation they\'ve been wrong about something for years',
  'accidentally agrees to something they completely misunderstood',
  'forgets someone\'s name right before having to introduce them',
  'gets called out for a lie in the most public way possible',
  'accidentally friendzones themselves',
  'is confidently wrong in front of an expert',
  'shows up to the wrong location for something important',
  'tries to fix a problem and makes it dramatically worse',
  'discovers something about themselves everyone else already knew',
  'gets mistaken for someone else and goes along with it too long',
  'has to pretend they understand something they absolutely don\'t',
];

const TWISTS = [
  'and it turns out the other person had no idea either',
  'only to find out it was actually a test',
  'but it ends up working out perfectly by accident',
  'and the awkward silence reveals everything',
  'until someone records the whole thing',
  'and the one person they were avoiding sees the entire thing',
  'but the other person already knew the whole time',
  'then a complete stranger saves the day in the most unexpected way',
  'and it somehow becomes the best thing that ever happened to them',
  'then their boss/parent/partner walks in at the worst possible second',
  'only to realize they\'ve been talking to the wrong person entirely',
  'until autocorrect adds the final insult',
  'and the Wi-Fi cuts out at the most critical moment',
  'only for it to become an inside joke that follows them forever',
  'and the person they least expected is the one who witnessed it',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildCreativeConstraint() {
  return `SETTING: ${pick(SETTINGS)} | CHARACTER: ${pick(CHARACTERS)} | CONFLICT: They ${pick(CONFLICTS)} | TWIST: ${pick(TWISTS)}`;
}

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
  const minSegments = Math.ceil(duration / 4); // ~4s per image → more visual variety
  // Words per segment: subtract ~15 each for hook and CTA, split the rest evenly
  const wordsPerSegment = Math.round((targetWords - 30) / minSegments);
  const minWordsPerSeg = Math.max(5, wordsPerSegment - 2);
  const maxWordsPerSeg = wordsPerSegment + 3;

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
${customCTA ? `CALL TO ACTION (use this EXACT text verbatim as the callToAction field): "${customCTA}"` : ''}
${scenarioHint ? `\nMANDATORY CREATIVE CONSTRAINT — You MUST base this video on the exact scenario below. Do NOT deviate, do NOT substitute a generic or similar situation. This constraint is for your creative use only — do not read it aloud or reference it in the script:\n${scenarioHint}` : ''}

Formatting Rules:
- Follow a 'hook, story, offer' structure
- Start with a powerful HOOK that stops the scroll. CRITICAL: The FIRST 3 WORDS of the hook must work as a standalone thumbnail text — punchy, curiosity-driving, and impactful on their own (e.g. "YOU WASTED EVERYTHING", "NOBODY TELLS YOU", "THIS BROKE ME"). These 3 words will be displayed as captions on the thumbnail frame.
- WORD COUNT IS CRITICAL: The total word count of (hook + all segment texts + callToAction) MUST be exactly ${targetWords} words. This determines video length — going over makes the video too long.
- Each segment text must be ${minWordsPerSeg}–${maxWordsPerSeg} words. Use short sentences (3-5 words each) for caption display.
- You MUST include exactly ${minSegments} segments — no more, no fewer
- DO NOT use any emojis anywhere in the script
- ${customCTA ? `The callToAction field MUST be exactly: "${customCTA}"` : 'End with a strong call-to-action (the Offer)'}

INWORLD TTS DELIVERY INSTRUCTIONS — these directly control how the voice sounds:
1. EMPHASIS: Wrap the single most impactful word in each sentence with *single asterisks* (e.g. "This one mistake cost me *everything*"). Max 1-2 per segment. Never double asterisks.
2. VOCALIZATIONS: Insert non-verbal tokens where they genuinely enhance emotion. Supported tokens: [sigh], [laugh], [breathe], [cough], [clear_throat], [yawn]. Use 2-4 total across the whole script.
   - Use [sigh] for defeat, relief, exhaustion
   - Use [laugh] for irony, disbelief, genuine humor
   - Use [breathe] for tension, suspense, dramatic pauses
   - Niche-specific: scary → [breathe], funny → [laugh], motivational → [sigh] for contrast
3. PACING: Use ellipsis (...) for dramatic beats and suspense. Use short punchy sentences (3-5 words) for fast delivery. Use longer sentences for slow, measured moments.
4. NATURAL SPEECH: ${['funny', 'lifestyle', 'funfacts'].includes(niche) ? 'This is a casual niche — use contractions (don\'t, can\'t, I\'m), filler words (I mean, you know, look), and conversational rhythm. Sound like a real person talking.' : 'Use contractions naturally (don\'t, can\'t, I\'m) but keep delivery clear and intentional.'}
5. TEXT NORMALIZATION: Write all numbers, currencies, and dates in spoken form — "fifteen hundred dollars" not "$1,500", "december fourth" not "12/4". The TTS engine will handle it but spoken form is more reliable.

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

  const provider = (process.env.VOICE_PROVIDER || 'elevenlabs').toLowerCase();

  // Strip emojis always
  const noEmoji = fullScript
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/_/g, '')
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanScript;
  if (provider === 'inworld') {
    // Inworld supports *emphasis* and [vocalizations] — keep them
    // Double asterisks would be read aloud — strip those, keep single
    cleanScript = noEmoji
      .replace(/\*\*([^*]+)\*\*/g, '$1') // strip **bold** markdown, keep text
      .replace(/[-—]/g, ',')             // dashes → comma pause
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // ElevenLabs / OpenAI — strip all markup and vocalizations
    cleanScript = noEmoji
      .replace(/\*\*/g, '')              // strip bold markdown
      .replace(/\*([^*]+)\*/g, '$1')     // strip *emphasis* markers
      .replace(/\[[^\]]+\]/g, '')        // strip [laugh], [sigh] etc.
      .replace(/\.{2,}/g, ',')           // ellipses → comma pause
      .replace(/[-—]/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    ...script,
    fullScript,
    cleanScript,
    wordCount: fullScript.split(' ').length,
    estimatedDuration: Math.round(fullScript.split(' ').length / 2.5) // ~2.5 words/sec
  };
}
