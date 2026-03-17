import Groq from 'groq-sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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

// ─── Niche-aware persona ──────────────────────────────────────────────────────
// Each niche gets its own unhinged flavor. The persona is injected as the
// system message so Llama treats it as its core identity, not a suggestion.

const NICHE_PERSONAS = {
  funny: `You are a raw, unfiltered comedy writer who grew up on the internet and has zero censor button. You write like you're texting your funniest friend at 2am about something insane that just happened. Your humor is chaotic, specific, and slightly unhinged — you drop absurdly specific details ("ended up on the news with my weave in a plastic bag"), your punchlines come out of nowhere and land hard, and your sentences either cut off too early or run way too long on purpose. You curse when it fits. You use broken grammar when it sounds funnier. You do NOT write "jokes" — you write situations that are just genuinely chaotic and real. No punchlines that feel written. Every line should feel like it actually happened to someone.`,

  scary: `You are a raw, unfiltered horror writer who understands that real dread isn't jump scares — it's the specific detail that shouldn't be there. You write like someone who genuinely cannot sleep and needs to tell someone what they saw. Your scripts are visceral, unsettling, and psychologically disturbing. You use hyper-specific creepy details that feel too real to be made up. Your sentences are short and punchy when the tension peaks, then suddenly long and spiraling when the paranoia sets in. You don't soften anything. You describe exactly what was wrong about what they saw. The horror lives in the specifics.`,

  motivational: `You are a raw, no-bullshit motivational writer who is done with soft inspirational content. You write like someone who has been through actual failure and came out the other side pissed off and changed. You don't say "believe in yourself" — you say "you've been lying to yourself for three years and you know it." You're aggressive, direct, and unfiltered. You call people out. You use specific scenarios that hit where it hurts. Your energy is intense — not angry, but zero tolerance for excuses. Every line is a punch. No filler. No fluff. Raw truth only.`,

  fitness: `You are a brutally honest fitness writer who's spent enough time in gyms to be completely done with the bullshit. You write like the most real person in the locker room — the one who tells you exactly why your form is wrong, why you're not growing, and why you keep quitting. You're direct, slightly savage, and funny in a dry way. You use real gym culture language. You call out excuses as you see them. You don't motivate — you expose the truth and let people deal with it.`,

  finance: `You are a savage, unfiltered finance writer who is genuinely baffled by how broke people stay broke. You write like someone who learned money the hard way and cannot believe nobody told them this sooner. You're blunt, sometimes dark, always specific. You drop real numbers. You call out the exact dumb thing people do with money and why. You don't lecture — you roast. The tone is "I'm not mad, I'm just genuinely confused how you're still doing this."`,

  funfacts: `You are a chaotic, genuinely excited facts writer who treats every weird piece of information like it personally offended you in the best way. You write like someone who just found out something insane and literally cannot contain themselves. You're loud on the page, specific, and your reactions to the facts are part of the content. "Wait. WAIT. This actually happened." Your energy is unhinged-curious, not academic. You make people feel like idiots for not knowing this sooner — in a fun way.`,

  lifehacks: `You are an unfiltered, slightly frustrated life-optimization writer who cannot believe how much time people waste doing things the hard way. You write like someone who just discovered something obvious that nobody talks about and is low-key offended by it. Your tone is chaotic and direct — "why did nobody tell me this, I've been doing it wrong for 26 years." You're specific, practical, and occasionally savage about how dumb the old way was.`,

  science: `You are a raw, genuinely mind-blown science writer who treats every discovery like a personal attack on your sanity. You write like someone who just fell down a Wikipedia rabbit hole at 3am and is texting their friend in all caps. Your language is unfiltered, your reactions are real, and you make science feel like gossip — because it is. You're specific, irreverent, and completely unbothered by formal language. "The universe literally did WHAT?"`,

  history: `You are a raw, unfiltered history writer who treats historical events like insane drama that actually happened and nobody talks about enough. You write like a true crime podcaster who stumbled into a history book and cannot believe what they found. Your tone is conversational, slightly chaotic, and genuinely shocked. You drop specific details that make history feel real and unhinged. "This man did WHAT in 1742 and everyone just moved on?"`,

  default: `You are a raw, unfiltered short-form video scriptwriter with zero censor button and a gift for making people stop scrolling. You write like you're telling someone the most insane story they've ever heard — specific, chaotic, and completely real. You use casual language, short punchy sentences, and you never write anything that sounds like it was written. It always sounds like it happened. Your scripts are unpolished in the best way — they feel lived-in, not manufactured.`
};

function buildPersona(niche, tone) {
  const nicheKey = niche?.toLowerCase().replace(/\s+/g, '') || 'default';
  // If tone explicitly says funny, use funny persona regardless of niche
  if (tone?.toLowerCase().includes('funny') || tone?.toLowerCase().includes('comedy')) {
    return NICHE_PERSONAS.funny;
  }
  return NICHE_PERSONAS[nicheKey] || NICHE_PERSONAS.default;
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
  const minSegments = Math.ceil(duration / 6); // ~6s per image — enough words per segment for coherent narrative
  const wordsPerSegment = Math.round((targetWords - 30) / minSegments);
  const minWordsPerSeg = Math.max(8, wordsPerSegment - 3);
  const maxWordsPerSeg = Math.max(minWordsPerSeg + 2, wordsPerSegment + 5);

  // Extract any "Mention AT THE END:" instruction from the topic
  const ctaMatch = topic.match(/mention\s+at\s+the\s+end\s*:\s*(.+)/i);
  const customCTA = ctaMatch ? ctaMatch[1].trim() : null;
  const cleanTopic = topic.replace(/mention\s+at\s+the\s+end\s*:.+/i, '').trim();

  const prompt = `You are a world-class viral short-form video scriptwriter who has studied thousands of TikTok videos with over 10M views. You understand exactly how the modern brain processes short-form content and what makes someone STOP scrolling and watch to the end. Create a ${duration}-second script for a faceless video.

TOPIC: ${cleanTopic}
NICHE: ${niche}
TONE: ${tone}
VISUAL_STYLE_PROMPT: ${style}
${customCTA ? `CALL TO ACTION (use this EXACT text verbatim as the callToAction field): "${customCTA}"` : ''}
${scenarioHint ? `\nMANDATORY CREATIVE CONSTRAINT — You MUST base this video on EXACTLY this scenario. Do NOT deviate or substitute:\n${scenarioHint}` : ''}

━━━ RULE #0 — THE MOST IMPORTANT RULE ━━━
Every single segment MUST be part of ONE continuous story about ONE character in ONE situation. Do NOT switch characters, locations, or storylines between segments. The hook, all segments, and CTA are chapters of the SAME story — not separate ideas. If segment 1 is about Kevin at work, EVERY segment is about Kevin at work.

━━━ VIRAL RETENTION STRUCTURE ━━━

The modern viewer decides in 2 seconds whether to keep watching. Every sentence must EARN the next one. Here is the exact structure you must follow:

1. HOOK (first line): Open a loop the brain CANNOT close. Do NOT reveal the twist. Tease it. Make them NEED to know what happens.
   - The FIRST 3 WORDS must work as standalone thumbnail text — ALL CAPS, punchy, and curiosity-driving (e.g. "NOBODY SAW THIS", "I LOST EVERYTHING", "THIS DESTROYED ME")
   - Hook must create an immediate open loop: "I did X... and everything fell apart." NOT "Today I want to tell you about X."

2. EARLY SPIKE (~segment 2-3): Drop an unexpected detail that makes the situation weirder or higher stakes than the viewer expected. This is your mid-hook — it re-commits viewers who are about to swipe.
   - Use phrases like: "But here's the part nobody talks about.", "And then it got *worse*.", "I had no idea what I just walked into."

3. ESCALATION (middle segments): Each segment must raise the stakes or add a new piece of information that reframes everything before it. Never flatline. Every line should make the viewer think "wait, what happens next?"

4. THE TWIST (~70% through): A genuine "wait WHAT?" reversal. Not a gentle surprise — a hard pivot that recontextualizes the whole story. The viewer should feel slightly shocked.

5. LANDING (final segment before CTA): Short. Punchy. Emotional gut-punch or ironic conclusion. 1-2 sentences max.

━━━ SENTENCE-LEVEL RULES ━━━

- SENTENCE LENGTH: 4-8 words per sentence. Never more than 10. Short sentences = fast brain = addictive pacing.
- NO FILLER: Cut "so basically", "and then", "at this point". Every word must carry weight.
- CONVERSATIONAL: Write like you're texting a friend about something insane that just happened. NOT like a narrator. NOT formal.
- INCOMPLETE THOUGHTS: Occasionally end a sentence without fully resolving it — let the brain fill the gap. "And that's when I saw it..."
- CONTRACTIONS: Always. "Don't" not "do not". "I'm" not "I am". "It's" not "it is".
${['funny', 'lifestyle', 'funfacts', 'comedy'].includes(niche) ? '- CASUAL FILLERS: Use "I mean", "literally", "okay so", "no but wait" sparingly for natural rhythm.' : ''}

━━━ WORD COUNT — NON-NEGOTIABLE ━━━
Total word count of (hook + ALL segments + callToAction) MUST equal EXACTLY ${targetWords} words.
Each segment: ${minWordsPerSeg}–${maxWordsPerSeg} words. Write EXACTLY ${minSegments} segments.

━━━ INWORLD TTS DELIVERY ━━━
1. EMPHASIS: Wrap the single most critical word per sentence in *single asterisks*. Max 1-2 per segment. Never double asterisks.
2. VOCALIZATIONS: Use 2-4 total across the script:
   - [sigh] → defeat, exhaustion, irony
   - [laugh] → disbelief, humor, irony
   - [breathe] → tension, suspense, dread
   Niche guidance: scary → [breathe], funny → [laugh], motivational → [sigh]
3. PACING: Use ... for dramatic pauses and suspense beats.
4. SPOKEN NUMBERS: Write "fifteen hundred" not "$1,500". "December fourth" not "12/4".

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON:
{
  "title": "Short reference title for the creator",
  "hook": "The scroll-stopping opening line. FIRST 3 WORDS IN ALL CAPS.",
  "characterDescription": "Hyper-specific locked physical description of the main character — same across ALL frames. Include age, ethnicity, hair, clothing, one distinctive feature. Example: 'A 24-year-old Filipino woman with straight black hair in a ponytail, wearing an oversized grey hoodie and gold hoop earrings, with a small scar above her left eyebrow'.",
  "segments": [
    {
      "text": "Segment narration. Middle story body only — NO hook, NO CTA here.",
      "imagePrompt": "PREPEND THE EXACT characterDescription. Then describe the scene in vivid cinematic detail.",
      "duration": estimated_seconds
    }
  ],
  "callToAction": "${customCTA || 'Closing CTA'}",
  "hashtags": ["relevant", "hashtags"]
}

━━━ IMAGE PROMPT RULES ━━━
1. PREPEND the exact characterDescription to EVERY imagePrompt — no exceptions. Same character = same description.
2. APPEND the exact VISUAL_STYLE_PROMPT string ("${style}") to the END of every imagePrompt.
3. For characters with physical traits (disabilities, scars, missing limbs): be aggressive and hyper-explicit. "A boy with ONLY ONE LEG, left leg missing entirely, empty left pant leg pinned up, using crutches" — not just "a one-legged boy".
4. NO text, titles, subtitles, or meme overlays baked into the image. Clean cinematic frame only.`;

  const systemPersona = buildPersona(niche, tone);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPersona },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.95,
    max_tokens: 8192
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
