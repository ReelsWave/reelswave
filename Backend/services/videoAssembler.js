import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

// Find ffmpeg/ffprobe - try system paths first, then npm static packages
function findBinary(name, systemPaths) {
    for (const p of systemPaths) {
        if (fs.existsSync(p)) {
            console.log(`[videoAssembler] Found ${name} at: ${p}`);
            return p;
        }
    }
    console.log(`[videoAssembler] ${name} not found at system paths, will rely on PATH`);
    return name;
}

const ffmpegPath = findBinary('ffmpeg', ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']);
const ffprobePath = findBinary('ffprobe', ['/usr/bin/ffprobe', '/usr/local/bin/ffprobe']);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Assemble final video from clips, voiceover, and captions
 * @param {Object} options
 * @param {Array} options.clips - Array of clip objects with paths
 * @param {string} options.audioPath - Path to voiceover audio
 * @param {string} options.outputDir - Output directory
 * @param {string} options.jobId - Unique job ID
 * @param {Object} options.script - Script object with segments
 * @param {boolean} options.watermark - Whether to add watermark
 * @returns {string} Path to final assembled video
 */
export async function assembleVideo({ clips, audioPath, outputDir, jobId, script, timestamps, watermark = false }) {
    const outputPath = path.join(outputDir, `${jobId}_final.mp4`);
    const concatListPath = path.join(outputDir, `${jobId}_concat.txt`);

    // Step 1: Get audio duration to know total video length
    const audioDuration = await getMediaDuration(audioPath);

    // Step 2: Calculate EXACT dynamic duration for each clip using ElevenLabs word timestamps
    let clipDurations = [];
    if (script && script.segments && clips.length === script.segments.length && timestamps && timestamps.length > 0) {
        // We have exactly N clips for N segments.
        // We must merge the hook text into the first block, and the CTA into the last block.
        const textBlocks = [];
        for (let i = 0; i < script.segments.length; i++) {
            let blockText = script.segments[i].text || "";
            if (i === 0) {
                blockText = (script.hook || "") + " " + blockText;
            }
            if (i === script.segments.length - 1) {
                blockText += " " + (script.callToAction || "");
            }
            textBlocks.push(blockText);
        }

        let currentTsIndex = 0;

        for (let i = 0; i < textBlocks.length; i++) {
            const blockText = textBlocks[i] || "";
            // Strip punctuation and emojis to count purely spoken words
            const blockWords = blockText
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?]/g, '')
                .trim()
                .split(/\s+/)
                .filter(w => w.length > 0);

            let blockStartTs = currentTsIndex < timestamps.length ? timestamps[currentTsIndex].start : 0;

            // Advance the global TS index by the exact number of words spoken in this block
            let wordsAdvanced = 0;
            while (wordsAdvanced < blockWords.length && currentTsIndex < timestamps.length) {
                currentTsIndex++;
                wordsAdvanced++;
            }

            // The end of this block is the end time of the last word spoken in this block
            let blockEndTs = audioDuration; // Default to end of audio if we run out of timestamps
            if (currentTsIndex > 0 && currentTsIndex <= timestamps.length) {
                blockEndTs = timestamps[currentTsIndex - 1].end;
            }

            // If there's a gap before the NEXT word begins (like a dramatic pause),
            // we extend THIS clip's duration to fill the gap so the screen doesn't go black early.
            if (currentTsIndex < timestamps.length) {
                blockEndTs = timestamps[currentTsIndex].start;
            }

            // Final fallback safety
            if (i === textBlocks.length - 1) {
                blockEndTs = audioDuration; // The very last clip MUST carry to the exact end of the audio file
            }

            let duration = (blockEndTs - blockStartTs) || 2.0;
            clipDurations.push(duration);
        }
    } else {
        // Fallback: simple math division if timestamps fail or counts mismatch
        console.warn("[videoAssembler] Falling back to static math for clip durations");
        const avg = audioDuration / clips.length;
        clipDurations = clips.map(() => avg);
    }

    // Step 3: Format and animate images or handle videos
    const processedClips = [];
    for (let i = 0; i < clips.length; i++) {
        const processedPath = path.join(outputDir, `${jobId}_processed_${i}.mp4`);

        await new Promise((resolve, reject) => {
            let command = ffmpeg(clips[i].path);

            if (clips[i].isImage) {
                // Determine framerate
                const fps = 25;
                const frames = Math.ceil(clipDurations[i] * fps) + 50;

                command = command.inputOptions(['-loop', '1'])
                    .outputOptions([
                        '-t', String(clipDurations[i]),
                        '-vf', `format=yuv420p,zoompan=z='zoom+0.0015':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920`,
                        '-c:v', 'libx264',
                        '-preset', 'fast',
                        '-crf', '28',
                        '-y'
                    ]);
            } else {
                command = command.outputOptions([
                    '-t', String(clipDurations[i]),
                    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1',
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '28',
                    '-an',
                    '-y'
                ]);
            }

            command.output(processedPath)
                .on('end', () => {
                    processedClips.push(processedPath);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`Error processing clip ${i}:`, err.message);
                    reject(err);
                })
                .run();
        });
    }

    // Step 4: Create concat file for FFmpeg
    const concatContent = processedClips
        .map(p => `file '${p.replace(/\\/g, '/')}'`)
        .join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    // Step 5: Concatenate all clips
    const concatenatedPath = path.join(outputDir, `${jobId}_concatenated.mp4`);
    await new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatListPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions([
                '-c', 'copy',
                '-y'
            ])
            .output(concatenatedPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });

    // Step 6: Build Advanced SubStation Alpha caption filter with exact word sync using ElevenLabs timestamps
    const captionFilter = buildAssCaptions(script, audioDuration, jobId, outputDir, timestamps);

    // Step 7: Combine video + audio + captions + optional watermark
    await new Promise((resolve, reject) => {
        const filters = [captionFilter];

        if (watermark) {
            filters.push("drawtext=text='ReelsWave':fontsize=24:fontcolor=white@0.4:x=w-tw-20:y=h-th-20");
        }

        // Filter error debugging
        console.log('--- FFMPEG FILTERS ---');
        console.log(filters.join(','));
        console.log('----------------------');

        ffmpeg()
            .input(concatenatedPath)
            .input(audioPath)
            .outputOptions([
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '28',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest',
                '-vf', filters.join(','),
                '-y'
            ])
            .output(outputPath)
            .on('end', resolve)
            .on('error', (err, stdout, stderr) => {
                console.error('FFmpeg compilation error:');
                console.error(stderr);
                reject(err);
            })
            .run();
    });

    // Step 8: Cleanup temp files
    cleanupTempFiles(outputDir, jobId, ['_final.mp4']);

    return outputPath;
}

/**
 * Get duration of a media file in seconds
 */
function getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

/**
 * Build Advanced SubStation Alpha (.ass) file perfectly synced via ElevenLabs word timestamps
 */
function buildAssCaptions(script, audioDuration, jobId, outputDir, timestamps) {
    // Use cleanScript (what ElevenLabs actually received) so word count matches timestamps exactly.
    // Falling back to rebuilding from segments if cleanScript is missing.
    const rawText = script.cleanScript || [
        script.hook,
        ...script.segments.map(s => s.text),
        script.callToAction
    ].join(' ');

    // Strip any remaining markdown (cleanScript should already be clean, but be safe)
    const cleanText = rawText.replace(/\*\*/g, '').replace(/_/g, '');

    // Split text into words (retaining connected emojis)
    const assWords = cleanText.split(/\s+/).filter(w => w.length > 0);
    const wordsPerCaption = 3;

    // ASS File Header layout (Alignment 5 = Center Middle, 110px Font, Black outline/shadow)
    let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Liberation Sans,110,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,6,5,20,20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Convert seconds to ASS format: H:MM:SS.cs
    function formatAssTime(seconds) {
        if (!seconds) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.floor((seconds % 1) * 100);
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }

    let tsIndex = 0;
    let globalLastEndTime = 0; // Better tracking for non-spoken punctuations

    for (let i = 0; i < assWords.length; i += wordsPerCaption) {
        const captionWords = assWords.slice(i, i + wordsPerCaption);

        // Map the current caption words to their corresponding ElevenLabs timestamps
        const wordTimings = [];
        for (let j = 0; j < captionWords.length; j++) {
            const rawWord = captionWords[j];

            // Strip emojis and punctuation from the word to check if it's actually spoken and matched against elevenlabs
            const spokenPart = rawWord
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?]/g, '')
                .trim()
                .toLowerCase();

            let start = 0;
            let end = 0;
            let foundMatch = false;

            if (spokenPart.length > 0 && timestamps && tsIndex < timestamps.length) {
                // Determine if this exact word is the one expected by ElevenLabs, handling case where 
                // elevenlabs combined words or stripped different characters
                const elevenWord = (timestamps[tsIndex].word || '').toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()'"?]/g, '').trim();

                if (elevenWord === spokenPart || elevenWord.includes(spokenPart) || spokenPart.includes(elevenWord)) {
                    start = timestamps[tsIndex].start || 0;
                    end = timestamps[tsIndex].end || (start + 0.3);
                    tsIndex++;
                    foundMatch = true;
                    globalLastEndTime = end;
                }
            }

            if (!foundMatch) {
                // This is purely an emoji, un-narrated punctuation, or a word ElevenLabs skipped.
                // It assumes the timing immediately following the last tracked word.
                start = globalLastEndTime;
                end = start + 0.1;
                globalLastEndTime = end;
            }

            wordTimings.push({ word: rawWord, start, end });
        }

        // Output a dialogue line for EACH word in the caption block, scanning the highlight forward 
        for (let j = 0; j < wordTimings.length; j++) {
            const currentTiming = wordTimings[j];

            let activeLineText = "";

            for (let index = 0; index < wordTimings.length; index++) {
                const isHighlight = index === j;
                const wt = wordTimings[index];

                // For the active word, we change color and scale up
                if (isHighlight) {
                    activeLineText += `{\\c&H00FFFF&}{\\fscx120\\fscy120}${wt.word}{\\fscx100\\fscy100}{\\c&HFFFFFF&}`;
                } else {
                    activeLineText += wt.word;
                }

                // Add a space between words
                if (index < wordTimings.length - 1) {
                    activeLineText += " ";
                }
            }

            // Lock to absolute center so the baseline doesn't jump when words scale
            activeLineText = `{\\an5}${activeLineText}`;

            // Bridging micro-pauses:
            let renderStart = currentTiming.start;
            let renderEnd = currentTiming.end;

            // If there is another word after this one IN THIS BLOCK, extend this frame to touch it
            if (j < wordTimings.length - 1) {
                renderEnd = wordTimings[j + 1].start;
            } else if (i + wordsPerCaption < assWords.length && timestamps && tsIndex < timestamps.length) {
                // If it's the last word in the block, and another block exists, extend the frame
                // slightly to touch the START of the VERY NEXT spoken word in the global stream 
                // (or cap at 0.5s max so it doesn't freeze on screen for long pauses)
                let nextGlobalStart = timestamps[tsIndex].start;
                if (nextGlobalStart - renderEnd > 0 && nextGlobalStart - renderEnd < 0.5) {
                    renderEnd = nextGlobalStart;
                }
            }

            // Fallback safety to ensure end is always strictly after start
            if (renderEnd <= renderStart) renderEnd = renderStart + 0.1;

            assContent += `Dialogue: 0,${formatAssTime(renderStart)},${formatAssTime(renderEnd)},Default,,0,0,0,,${activeLineText}\n`;
        }
    }

    // Save .ass file temporarily alongside output
    const assFilePath = path.join(outputDir, `${jobId}_captions.ass`);
    fs.writeFileSync(assFilePath, assContent);

    // Convert to FFmpeg-safe path (forward slashes and escape the drive colon like C\\:/)
    const escapedPath = assFilePath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
    return `ass=${escapedPath}`;
}

/**
 * Remove temporary processing files, keeping only specified suffixes
 */
function cleanupTempFiles(outputDir, jobId, keepSuffixes = []) {
    const files = fs.readdirSync(outputDir);

    for (const file of files) {
        if (file.startsWith(jobId)) {
            const shouldKeep = keepSuffixes.some(suffix => file.endsWith(suffix));
            if (!shouldKeep) {
                try {
                    fs.unlinkSync(path.join(outputDir, file));
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    }
}
