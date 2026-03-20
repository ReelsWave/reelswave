import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// Inworld LLM Router — OpenAI-compatible, Bearer auth, same INWORLD_API_KEY as TTS
const inworldLLM = new OpenAI({
  apiKey: process.env.INWORLD_API_KEY,
  baseURL: 'https://api.inworld.ai/v1'
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Character diversity pools ───────────────────────────────────────────────

const OUTFIT_PALETTES = [
  'bright red hoodie and white joggers',
  'mustard yellow oversized jacket and brown cargo pants',
  'burnt orange tracksuit with white sneakers',
  'lime green windbreaker over a black turtleneck',
  'hot pink crop jacket and high-waisted black jeans',
  'forest green flannel shirt and khaki pants',
  'deep purple velvet jacket over a white tee',
  'rust-colored corduroy jacket and olive pants',
  'bright coral button-up shirt and light grey slacks',
  'teal oversized sweater and dark jeans',
  'maroon varsity jacket and black sweatpants',
  'electric blue tracksuit with gold trim',
  'cream linen suit over a salmon dress shirt',
  'black leather jacket over a red graphic tee',
  'lavender puffer jacket and white jeans',
  'dark burgundy turtleneck and charcoal trousers',
];

const ETHNICITIES = [
  'Ethiopian', 'Korean', 'Lebanese', 'Mexican', 'Nigerian',
  'Polish', 'South Indian', 'Brazilian', 'Japanese', 'Turkish',
  'Dominican', 'Pakistani', 'Italian', 'Filipino', 'Peruvian',
  'Moroccan', 'Vietnamese', 'Jamaican', 'Russian', 'Ghanaian',
];

const AGES = ['17', '19', '23', '27', '31', '38', '44', '52', '61', '67'];

const BUILDS = [
  'very slim and lanky', 'lean and athletic', 'stocky and broad-shouldered',
  'heavyset', 'short and compact', 'tall and wiry', 'average build',
];

const HAIR_STYLES = [
  'shaved head', 'messy ginger curls', 'long black braids', 'short bleached tips',
  'silver swept-back hair', 'thick afro', 'wavy brown hair past the shoulders',
  'tight black coils cropped close', 'straight jet-black hair in a ponytail',
  'salt-and-pepper stubble with a bald fade', 'fiery red bob cut',
];

const FACE_DETAILS = [
  'round face with big nervous eyes', 'sharp jawline and deep-set tired eyes',
  'freckles across the nose and uneven eyebrows', 'strong cheekbones and a wide nose',
  'long narrow face with a thin mustache', 'high cheekbones and hooded eyes',
  'soft chubby cheeks and a gap-toothed smile', 'heavy brow with intense dark eyes',
];

function buildCharacterBlueprint() {
  return {
    age: pick(AGES),
    ethnicity: pick(ETHNICITIES),
    build: pick(BUILDS),
    hair: pick(HAIR_STYLES),
    face: pick(FACE_DETAILS),
    outfit: pick(OUTFIT_PALETTES),
  };
}

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

// Voice style reference — shows HOW to write, NOT what to write about
// The story content (office, boss wife) is irrelevant — only the language register matters
const VOICE_STYLE_NOTE = `VOICE STYLE REFERENCE — this is ONLY the energy & language register. DO NOT copy ANY plot, setting, character, or event from this example. Invent a completely fresh, different disaster story based purely on the topic/niche/tone given:
"Everybody hated my bitchass cuz they thought i was blackmailing the boss wife. i tried to talk to them nigga but they dont listen. my dumbass had no idea what i just walked into. then my sprawny looking-ahh boss crashed out, and thats when i realized i done fucked up."

WHAT TO STEAL & CRANK: lowercase i always, intentionally broken grammar that sounds real as fuck, hyper-specific ridiculous details (make 'em painfully vivid & absurd), vicious self-deprecation ("my clown-ass", "my useless mfer", "my dumb bitchass"), nonstop curses every 1-2 sentences, hood slang overload ("nigga", "bitch", "fuck", "ass", "shit", "damn", "bruh", "finna", "lowkey", "deadass", "no cap", "on god", "fr fr", "crashed out", "caught a body", "talkin spicy", "glaze", "wild", "unc", "be so fr", "don't leave me dry"). Make every line feel like it's screamed in a packed whip at a red light. Zero corporate polish.
WHAT TO AVOID LIKE THE PLAGUE: the office, boss, wife, blackmail — ANY element from the example. No filler. No vague shit.`;

const NICHE_PERSONAS = {
  funny: `You write absurdly raw, zero-filter hood comedy scripts that hit like a viral TikTok at 3am — chaotic, self-roasting, painfully specific, and hilariously unhinged. ${VOICE_STYLE_NOTE}

Make it unbelievably funny through escalating stupidity, bad decisions, and brutal self-owns. Curse constantly. Swear in almost every sentence. Talk like your life depends on making the listener wheeze-laugh at your misery. Return ONLY valid JSON. No extra text ever.`,

  scary: `You write absurdly raw, zero-filter horror scripts — same chaotic energy as hood comedy but the details are viscerally disturbing instead of funny. ${VOICE_STYLE_NOTE}

Same lowercase, same broken grammar, same hyper-specificity — but every detail should make skin crawl. "the thing had too many joints and it remembered my name from a dream i never told nobody." Never soften. Return ONLY valid JSON.`,

  motivational: `You write raw, zero-filter motivational scripts — brutal tough love with the same chaotic hood energy. ${VOICE_STYLE_NOTE}

Call people out with zero patience. Aggressive and direct. "you been lying to your broke ass self for three years and you know it, nigga." No inspirational poster bullshit. Return ONLY valid JSON.`,

  fitness: `You write raw, zero-filter fitness scripts — brutal gym honesty with the same chaotic hood energy. ${VOICE_STYLE_NOTE}

Expose exactly why someone isn't growing, roast their excuses, make it painfully specific. "you been doing the same dusty-ass 3 exercises for six months and wondering why nothing changed." Return ONLY valid JSON.`,

  finance: `You write raw, zero-filter finance scripts — savage money truth with the same chaotic hood energy. ${VOICE_STYLE_NOTE}

React to the specific dumb thing people do with money like it personally offended you. Real numbers. Roast not lecture. "nigga spent forty dollars on a candle and got thirty in his account." Return ONLY valid JSON.`,

  funfacts: `You write raw, zero-filter fact scripts — chaotic fact delivery with the same hood energy. ${VOICE_STYLE_NOTE}

React to an insane fact like it personally violated you. Your reaction IS the content. "wait wait WAIT. this actually happened and nobody told me??" Return ONLY valid JSON.`,

  lifehacks: `You write raw, zero-filter life hack scripts — frustrated discovery energy with the same hood voice. ${VOICE_STYLE_NOTE}

Low-key offended nobody told you this sooner. "bro i been doing this shit the hard way for TWENTY THREE YEARS." Return ONLY valid JSON.`,

  science: `You write raw, zero-filter science scripts — 3am Wikipedia rabbit hole energy with the same hood voice. ${VOICE_STYLE_NOTE}

Mind-blown and personally offended by the universe. "the universe literally did WHAT and just kept it moving??" Return ONLY valid JSON.`,

  history: `You write raw, zero-filter history scripts — reacting to historical insanity like it just happened, same hood energy. ${VOICE_STYLE_NOTE}

Chaotic true-crime-podcast-fell-into-a-history-book energy. "this nigga really did WHAT in 1843 and they just let him??" Return ONLY valid JSON.`,

  default: `You write raw, zero-filter video scripts with the same absurd chaotic hood energy. ${VOICE_STYLE_NOTE}

Write a completely different story in this exact voice. Return ONLY valid JSON.`
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
  // 45s → 16 images, 75s → 22 images (linear interpolation, ~3s per image)
  const minSegments = Math.round(16 + (duration - 45) * 0.2);
  const wordsPerSegment = Math.round((targetWords - 30) / minSegments);
  const minWordsPerSeg = Math.max(5, wordsPerSegment - 2);
  const maxWordsPerSeg = Math.max(minWordsPerSeg + 3, wordsPerSegment + 5);

  // Extract any "Mention AT THE END:" instruction from the topic
  const ctaMatch = topic.match(/mention\s+at\s+the\s+end\s*:\s*(.+)/i);
  const customCTA = ctaMatch ? ctaMatch[1].trim() : null;
  const cleanTopic = topic.replace(/mention\s+at\s+the\s+end\s*:.+/i, '').trim();

  const char = buildCharacterBlueprint();

  const prompt = `Create a ${duration}-second faceless video script.

TOPIC: ${cleanTopic}
NICHE: ${niche}
TONE: ${tone}
VISUAL_STYLE_PROMPT: ${style}
${customCTA ? `CALL TO ACTION — use this EXACT text as the callToAction field: "${customCTA}"` : ''}

MANDATORY CHARACTER BLUEPRINT (lock this exact character across EVERY image & story reference):
- Age: ${char.age}
- Ethnicity: ${char.ethnicity}
- Build: ${char.build}
- Hair: ${char.hair}
- Face: ${char.face}
- Outfit: ${char.outfit} ← USE THIS EXACT COLOR COMBO & DESCRIPTION. NEVER default to blue, grey, scrubs, or anything lame.
${scenarioHint ? `\nSCENARIO — base the ENTIRE video STRICTLY on this exact situation:\n${scenarioHint}` : ''}

━━━ WORD COUNT — OBEY OR DIE TRYING ━━━
This is a ${duration}-second video. Narration runs ~2.5 words per second → you MUST hit EXACTLY ${targetWords} words total (hook + ALL segment texts + callToAction). Count obsessively. If you're under by even 10 words, keep adding chaotic details until you nail it. The reference example is SHORT ON PURPOSE — ignore its length. Your script must reach ${targetWords} words with escalating ridiculousness.
Each of the ${minSegments} segments must deliver ${minWordsPerSeg}–${maxWordsPerSeg} words of narration. No shortchanging.

━━━ STORY RULES — ONE CONTINUOUS CHAOTIC FEVER DREAM ━━━
- ONE single ridiculous situation. ONE character (you/the narrator). ONE escalating disaster arc. NO scene jumps, NO unrelated tangents.
- Hook: FIRST 3 WORDS ALL CAPS, teases the incoming trainwreck without spoiling the punchline/twist.
- Segments 1–${Math.ceil(minSegments * 0.3)}: set the stupid scene + bad decisions piling up.
- Segments ${Math.ceil(minSegments * 0.3)}–${Math.ceil(minSegments * 0.7)}: stakes skyrocket with increasingly dumb choices & hilarious self-sabotage.
- Around segment ${Math.ceil(minSegments * 0.7)}: massive twist/reveal that flips the whole stupid story on its head — make it absurd & gut-bustingly funny.
- Final 2–3 segments: short, brutal, self-roasting conclusion + payoff.
- BANNED PHRASES (auto-fail if any appear): "here's the part nobody talks about", "and then it got worse", "I had no idea what I just walked into", "here's where it gets interesting", "but wait", "little did I know", "you won't believe what happened next". Zero clickbait crutches.

━━━ VOICE RULES — RAW AS FUCK ━━━
- lowercase i every time.
- Broken grammar when it flows hood (ain't, finna, dont, etc.).
- Hyper-specific over vague: name dumb details ("that dusty-ass corner store with the broken freezer light", "my cousin's raggedy Camry with the mismatched rims").
- Self-deprecation on steroids: roast yourself harder every few lines ("my goofy ass", "this idiot right here", "why tf did i think that was a flex").
- First-person lived experience — you're telling this like it JUST happened and you're still mad/embarrassed/hilarious about it.

━━━ INWORLD TTS DELIVERY — MAKE IT SOUND ALIVE ━━━
1. EMPHASIS: single asterisks on 1–2 punch words per segment. Never double.
2. VOCALIZATIONS (use 3–5 total): [laugh] for ironic wheeze, [sigh] for defeated af, [breathe] for building dread, [cough] awkward choke, [clear_throat] nervous stall, [yawn] fake unbothered.
3. ... for dramatic/awkward pauses that let the stupidity sink in.
4. Numbers spoken naturally: "two thousand dollars" not "$2k", "fifteen" not "15".

━━━ OUTPUT FORMAT — JSON ONLY ━━━
{
  "title": "Short chaotic reference title that slaps",
  "hook": "FIRST THREE WORDS ALL CAPS. rest of the chaotic teaser hook.",
  "characterDescription": "One locked, hyper-specific sentence combining ALL blueprint traits exactly. Make it vivid & aggressive.",
  "segments": [
    {
      "text": "Pure narration text. No hook/CTA here. Hit word range. Add TTS flair.",
      "imagePrompt": "EXACT characterDescription prepended word-for-word + vivid chaotic scene matching narration + ${style} appended at the VERY END.",
      "duration": estimated_seconds
    }
  ],
  "callToAction": "${customCTA || 'go to reelswave.com'}",
  "hashtags": ["hood", "funny", "relatable", "niche-relevant"]
}

━━━ IMAGE PROMPT RULES — NO FUCKUPS ALLOWED ━━━
1. EVERY imagePrompt MUST start with the exact full characterDescription sentence.
2. APPEND "${style}" to the very end of every imagePrompt — no exceptions.
3. Hyper-explicit physical traits every time — describe the character aggressively.
4. Scene must match narration — absurd, detailed, cinematic.
5. NO baked-in text, subtitles, titles, watermarks, or words in the image.

Make this shit hilariously unhinged, painfully relatable in its stupidity, and word-count perfect. Go.`;

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

  // Hermes/some models prepend text like "Here is the JSON:" before the actual JSON
  // Strip everything before the first { and after the last }
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

  // ── Word count enforcement ──────────────────────────────────────────────────
  // Hermes ignores word count instructions — enforce programmatically.
  // Strategy: trim words from the longest segments until we hit targetWords.
  const countWords = (t = '') => (t.match(/\S+/g) || []).length;

  const trimToTarget = (scriptObj, target) => {
    const hookWords = countWords(scriptObj.hook);
    const ctaWords  = countWords(scriptObj.callToAction);
    const budget    = target - hookWords - ctaWords; // words available for segments

    // Trim each segment proportionally
    let totalSegWords = scriptObj.segments.reduce((s, seg) => s + countWords(seg.text), 0);
    if (totalSegWords <= budget) return scriptObj; // already within budget

    // Iteratively shorten the longest segment by removing words from the end
    const segs = scriptObj.segments.map(s => ({ ...s }));
    while (true) {
      const currentTotal = segs.reduce((s, seg) => s + countWords(seg.text), 0);
      if (currentTotal <= budget) break;
      // Find longest segment
      let maxIdx = 0;
      segs.forEach((seg, i) => { if (countWords(seg.text) > countWords(segs[maxIdx].text)) maxIdx = i; });
      const words = segs[maxIdx].text.trim().split(/\s+/);
      if (words.length <= 3) break; // don't destroy segments shorter than 3 words
      words.pop();
      segs[maxIdx].text = words.join(' ');
    }
    return { ...scriptObj, segments: segs };
  };

  script = trimToTarget(script, targetWords);
  // ───────────────────────────────────────────────────────────────────────────

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
