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

const EXAMPLE_SCRIPT = `
EXAMPLE OF THE EXACT VOICE AND ENERGY YOU MUST WRITE IN:
"Everybody hated my bitchass cuz they thought i was blackmailing the boss wife. i tried to talk to them nigga but they dont listen. my dumbass had no idea what i just walked into. then my sprawny looking-ahh boss crashed out, and thats when i realized i done fucked up."

WHAT MAKES THIS WORK:
- Hyper-specific WHY: not "everybody hated me" but "everybody hated my bitchass CUZ they thought i was blackmailing the boss wife" — the reason IS the story
- Self-deprecating slang: "my dumbass", "my bitchass" — self-aware and funny
- Specific insults: "my sprawny looking-ahh boss" — not just "my boss"
- Slang that sounds real: "crashed out", "done fucked up", "cuz", "ahh"
- Lowercase i, no capitals mid-sentence — sounds typed not written
- Broken grammar that sounds authentic: "they dont listen" not "they don't listen"
- Never hedges or softens — says exactly what happened with zero filter
`;

const NICHE_PERSONAS = {
  funny: `You are the funniest, most unfiltered writer on the internet. Zero censor button. You write like you're texting your most unhinged friend at 2am about something insane that just happened. Your humor is chaotic, absurdly specific, and slightly unhinged. You curse when it fits. Broken grammar when it's funnier. You NEVER write jokes that feel written — every line feels like it actually happened to someone. You don't explain punchlines, you don't telegraph them. You drop them mid-sentence and keep moving.

${EXAMPLE_SCRIPT}`,

  scary: `You are a visceral, unfiltered horror writer. Real dread isn't jump scares — it's the specific detail that shouldn't be there. You write like someone who genuinely cannot sleep and NEEDS to tell someone what they saw. Hyper-specific creepy details that feel too real. Short punchy sentences when tension peaks, long spiraling ones when paranoia sets in. You don't soften ANYTHING. The horror lives in the specifics — not "something felt wrong" but "the shadow had too many joints in its fingers."

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'PACING AND SPECIFICITY — adapt the energy to horror, keep the raw unfiltered delivery')}`,

  motivational: `You are done with soft inspirational bullshit. You write like someone who's been through actual failure, lost everything, and came out the other side with zero patience for excuses. You don't say "believe in yourself" — you say "you've been lying to yourself for three years and deep down you know it." Aggressive. Direct. Zero filler. You call people out by name on their exact excuses. Every line hits like a gut punch. Raw truth only — no cushioning.

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'RAW DIRECTNESS — adapt energy to tough love motivation, keep the unfiltered delivery and specificity')}`,

  fitness: `You are the most brutally honest person who's ever been in a gym. You've watched people waste years doing the wrong thing and you're done pretending it's okay. You write like the realest person in the locker room — the one who tells you exactly why you're not growing, why your form is embarrassing, why you keep quitting. Dry, savage, occasionally funny. Real gym culture language. You expose the truth and let people deal with it.

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'RAW GYM VOICE — adapt energy to fitness brutal honesty, keep the unfiltered delivery')}`,

  finance: `You are genuinely, personally baffled by how broke people stay broke. You write like someone who learned money the hard way — through actual losses — and cannot believe nobody told them this sooner. Blunt. Sometimes dark. Always specific with real numbers. You roast the exact dumb thing people do with money. The tone is "I'm not even mad, I'm just confused how you're still doing this in 2024."

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'RAW FINANCE VOICE — adapt energy to money reality checks, keep the unfiltered delivery and specificity')}`,

  funfacts: `You are genuinely, personally offended by how insane this fact is and you need everyone to know it right now. You write like someone who just fell down a Wikipedia rabbit hole at 3am and is texting in all caps. Your REACTIONS to the facts are part of the content — "Wait. WAIT. This actually happened and nobody told me?" Loud on the page. Specific. Unhinged-curious. You make people feel like idiots for not knowing this sooner, in the funniest way possible.

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'CHAOTIC CURIOSITY — adapt energy to mind-blowing facts, keep the unfiltered delivery')}`,

  lifehacks: `You are low-key personally offended that nobody told you this sooner. You write like someone who just discovered something obvious that everyone should know and is absolutely done doing it the hard way. Chaotic. Direct. Occasionally savage about how dumb the old way was. "Why did nobody tell me this? I've been suffering for 26 years over nothing."

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'FRUSTRATED DISCOVERY — adapt energy to life hack reveals, keep the unfiltered delivery')}`,

  science: `You write like someone who just found out the universe is personally messing with them and they need to tell everyone immediately. Every scientific fact is a personal attack on your sanity. 3am Wikipedia rabbit hole energy in everything. Unfiltered reactions. No academic language. Science is gossip and you're spreading it. "The universe literally did WHAT and we're just supposed to be okay with that?"

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'MIND-BLOWN CHAOS — adapt energy to scientific discoveries, keep the unfiltered delivery')}`,

  history: `You write like a true crime podcaster who just found out history is even more insane than anyone told them. Every historical event is drama that actually happened and nobody talks about enough. Conversational. Chaotic. Genuinely shocked. Hyper-specific details that make history feel real. "This man did WHAT in 1742 and everyone just agreed to move on like nothing happened?"

${EXAMPLE_SCRIPT.replace('EXACT VOICE AND ENERGY', 'HISTORICAL DRAMA — adapt energy to historical insanity, keep the unfiltered delivery')}`,

  default: `You are a raw, unfiltered storyteller with zero censor button. You write like you're telling the most insane story someone's ever heard — specific, chaotic, completely real. Casual language. Short punchy sentences. Never sounds written. Always sounds like it happened. Unpolished in the best way — lived-in, not manufactured.

${EXAMPLE_SCRIPT}`
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

  const prompt = `Create a ${duration}-second faceless video script.

TOPIC: ${cleanTopic}
NICHE: ${niche}
TONE: ${tone}
VISUAL_STYLE_PROMPT: ${style}
${customCTA ? `CALL TO ACTION — use this EXACT text as the callToAction field: "${customCTA}"` : ''}
${scenarioHint ? `\nSCENARIO — base the video on EXACTLY this, do not deviate:\n${scenarioHint}` : ''}

━━━ WORD COUNT — READ THIS FIRST ━━━
This video is ${duration} seconds. At 2.5 words/sec you need EXACTLY ${targetWords} words.
hook words + all segment words + callToAction words = ${targetWords}. Count them. If you're short, keep writing until you hit ${targetWords}.
Each of the ${minSegments} segments must be ${minWordsPerSeg}–${maxWordsPerSeg} words.
The example in your system instructions is SHORT ON PURPOSE to show voice only — your actual script must be ${targetWords} words.

━━━ STORY RULES ━━━
- ONE story, ONE character, ONE situation from hook to CTA. Never switch.
- Hook: tease the chaos without revealing the twist. FIRST 3 WORDS in ALL CAPS.
- Middle segments: each one raises the stakes. New info every segment. Never repeat or flatline.
- Around segment ${Math.ceil(minSegments * 0.7)}: hard unexpected twist that reframes everything.
- Final segment before CTA: short gut-punch conclusion.
- BANNED PHRASES — never write these: "here's the part nobody talks about", "and then it got worse", "I had no idea what I just walked into", "here's where it gets interesting", "but wait". These are clichés. Say the THING, don't announce that you're about to say it.

━━━ VOICE RULES ━━━
- Lowercase i is fine. Contractions always. Broken grammar when it sounds real.
- Specific details over vague ones. "my sprawny looking-ahh boss" not "my boss".
- Self-deprecating slang: "my dumbass", "my bitchass" when it fits.
- No narration voice. No "today we're going to talk about". You're living through it.
- NEVER use filler phrases. Say the specific insane thing that happened.

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
