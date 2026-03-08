const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// We need to use dynamic import for the ES module @fal-ai/serverless-client
dotenv.config();

const STYLES = [
    { id: 'vibrant_comic', name: 'Vibrant Comic', subject: 'A dynamic superhero flying through a bustling city skyline', prompt: 'vibrant comic book style, pop art, cel shaded, bold outlines, highly detailed' },
    { id: 'dark_novel', name: 'Dark Novel', subject: 'A terrifying shadowy monster lurking in a misty graveyard at midnight', prompt: 'dark comic book style, creepy, terrifying, deep shadows, gritty, high contrast, horror' },
    { id: 'modern_toon', name: 'Modern Toon', subject: 'A group of quirky teenagers hanging out at a neon-lit futuristic diner', prompt: 'modern 2D cartoon style, clean lines, flat colors, vector art, smooth, high quality' },
    { id: 'pixar_3d', name: 'Pixar 3D', subject: 'An adorable fluffy red panda wearing a tiny backpack', prompt: '3D rendered, Pixar style, cute, smooth lighting, Unreal Engine 5, octane render' },
    { id: 'studio_ghibli', name: 'Studio Ghibli', subject: 'A cozy magical bakery hidden in a lush green forest, glowing warm lights', prompt: 'Studio Ghibli style, lush anime background, watercolor, vibrant, masterpiece, beautiful' },
    { id: 'tokyo_anime', name: 'Tokyo Anime', subject: 'A cool cyberpunk street racer leaning against a futuristic motorcycle', prompt: 'anime style, 90s cel animation, retro aesthetic, high quality, masterpiece' },
    { id: 'oil_canvas', name: 'Oil Canvas', subject: 'A majestic galleon ship sailing through a violent thunderstorm', prompt: 'classic oil painting, visible brush strokes, canvas texture, classical art style, museum quality' },
    { id: 'grim_fantasy', name: 'Grim Fantasy', subject: 'A lone knight in dark armor facing a colossal undead dragon', prompt: 'dark fantasy, grimdark, gothic, moody, epic fantasy concept art, trending on artstation' },
    { id: 'toy_bricks', name: 'Toy Bricks', subject: 'A bustling medieval castle courtyard made of tiny plastic blocks', prompt: 'made entirely of plastic toy bricks, lego style, macro photography, highly detailed, miniature' },
    { id: 'vintage_photo', name: 'Vintage Photo', subject: 'A classic 1960s muscle car parked outside a retro diner', prompt: 'polaroid photograph, vintage, 35mm film, grainy, light leaks, nostalgic photography' },
    { id: 'cinematic', name: 'Cinematic', subject: 'A rugged astronaut exploring the dusty red canyons on Mars', prompt: 'cinematic photography, ultra realistic, 8k, sharp focus, dramatic lighting, photorealistic' },
    { id: 'ethereal_dream', name: 'Ethereal Dream', subject: 'A floating island with glowing crystal waterfalls in a purple sky', prompt: 'ethereal fantasy, glowing lights, magical, surreal, dreamy vibe, beautiful, glowing' }
];

async function generatePreviews() {
    console.log("Starting style preview generation...");

    // Dynamically import fal since it's an ES module and we are in CommonJS
    const falModule = await import('@fal-ai/serverless-client');
    const fal = falModule.default ? falModule.default : falModule;

    const outDir = path.join(__dirname, '..', 'Frontend', 'public', 'styles');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    for (const style of STYLES) {
        console.log(`Generating: ${style.name}...`);
        const fullPrompt = `${style.subject}, ${style.prompt}`;

        try {
            const result = await fal.subscribe("fal-ai/flux/schnell", {
                input: {
                    prompt: fullPrompt,
                    image_size: "portrait_16_9",
                    num_inference_steps: 4,
                    num_images: 1,
                    enable_safety_checker: false,
                    sync_mode: true
                }
            });

            if (result && result.images && result.images.length > 0) {
                const imageUrl = result.images[0].url;
                console.log(`Fetching image from: ${imageUrl}`);

                const response = await fetch(imageUrl);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const filePath = path.join(outDir, `${style.id}.jpg`);
                fs.writeFileSync(filePath, buffer);
                console.log(`Saved ${style.id}.jpg`);
            } else {
                console.error(`No image data returned for ${style.name}`);
            }
        } catch (err) {
            console.error(`Failed to generate ${style.name}:`, err.message);
        }
    }
    console.log("All previews generated!");
}

generatePreviews();
