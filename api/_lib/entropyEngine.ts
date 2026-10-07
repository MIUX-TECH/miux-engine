export interface WeightedItem {
    label: string;
    weight: number; // 8 = Common, 4 = Uncommon, 1-2 = Rare/Chaotic
}

export interface WeightedLocation {
    name: string;
    desc: string;
    vibe: string;
    lighting?: string;
    weight: number;
}

// Helper: Convert string array to weighted pool based on index to ensure distribution
export const toWeighted = (items: string[]): WeightedItem[] => {
    return items.map((label, index) => {
        // First 60% are common (8), next 30% uncommon (4), last 10% rare (2)
        const ratio = index / items.length;
        let weight = 8;
        if (ratio > 0.6) weight = 4;
        if (ratio > 0.9) weight = 2;
        return { label, weight };
    });
}

export const pickWeightedRandom = <T extends { weight: number, label?: string, name?: string }>(
    pool: T[], 
    chaosLevel: number = 3,
    avoidRepeat: boolean = true,
    recentPicks: Set<string> = new Set<string>()
): T => {
    // Adjust weights based on chaos level smoothly without dead zones
    const adjustedPool = pool.map(item => {
        let adjustedWeight = item.weight;
        
        if (chaosLevel > 3) {
            // Higher chaos (4 = Raw, 5 = Extreme Chaos): Boost rare items, suppress common items
            const chaosIntensity = (chaosLevel - 3); // 1 at lvl 4, 2 at lvl 5
            const invertedWeight = 9 - item.weight; // weight 1->8, 2->7, 3->6, 4->5, 5->4, 6->3, 8->1
            adjustedWeight = item.weight * (1 - chaosIntensity * 0.25) + invertedWeight * (chaosIntensity * 0.75);
        } else if (chaosLevel < 3) {
            // Lower chaos (2 = Light, 1 = Clean): Boost common items, suppress rare items
            const cleanIntensity = (3 - chaosLevel); // 1 at lvl 2, 2 at lvl 1
            const suppression = (8 - item.weight) * (cleanIntensity * 0.8);
            adjustedWeight = Math.max(0.2, (item.weight * (1 + cleanIntensity * 0.4)) - suppression);
        }

        // Penalty for recently picked items
        const identifier = item.label || item.name || '';
        if (avoidRepeat && recentPicks.has(identifier)) {
            adjustedWeight *= 0.1; // 90% penalty
        }

        return { item, weight: Math.max(0.05, adjustedWeight) };
    });

    const totalWeight = adjustedPool.reduce((sum, i) => sum + i.weight, 0);
    
    // Fallback if totalWeight is 0
    if (totalWeight <= 0) {
        const fallback = pool[Math.floor(Math.random() * pool.length)];
        const id = fallback.label || fallback.name || '';
        if (id) recentPicks.add(id);
        return fallback;
    }

    let random = Math.random() * totalWeight;
    
    for (const entry of adjustedPool) {
        if (random < entry.weight) {
            const id = entry.item.label || entry.item.name || '';
            if (id) {
                recentPicks.add(id);
                // Keep set size manageable
                if (recentPicks.size > 30) {
                    const first = recentPicks.values().next().value;
                    if (first) recentPicks.delete(first);
                }
            }
            return entry.item;
        }
        random -= entry.weight;
    }
    
    return adjustedPool[0].item;
};

// === 3. DATA POOLS (WEIGHTED INITIALIZATION) ===

const RAW_HAND_FEMININE = [
    "Delicate female hands with short natural nails", "Hands with chipped red nail polish",
    "Manicured nude gel nails, almond shape", "Pale hands wearing dainty gold rings",
    "Hands with a small faded tattoo on the wrist", "Soft hands with glossy lip tint smudge on thumb",
    "Elegant hands with French tips", "Hands wearing a thin silver bracelet",
    "Hands with a silk scrunchie on the wrist", "Matte black sharp stiletto nails",
    "Hands wearing a colorful friendship bracelet", "Hands with mismatched playful nail art",
    "Hands with fading henna design", "Hands with classic white nail tips",
    "Dewy female hands with sheer jelly pink blush nails", "Hands wearing stacked dainty gold rings and minimal cuff",
    "Manicured chrome glazed-donut nails, oval shape", "Soft female hands with sheer milky white nail polish",
    "Hands with delicate pearl ring on pinky finger", "Tan female hands wearing a woven evil-eye friendship bracelet",
    "Hands with glossy cuticle oil glow and buffed square nails", "Hands wearing a tortoiseshell hair clip around wrist",
    "Bare female hands with clean short rounded nails and soft skin", "Hands wearing minimalist silver chain rings"
];
export const POOL_HAND_FEMININE = toWeighted(RAW_HAND_FEMININE);

const RAW_HAND_MASCULINE = [
    "Veiny male hands with a silver thumb ring", "Rough worker hands with visible calluses",
    "Tan hands wearing a vintage gold watch", "Hands wearing Distressed Leather Biker Gloves",
    "Hands with prominent knuckles and a dark tattoo", "Masculine hands with short clipped nails",
    "Hands with a slight dirt smudge on the index finger", "Veiny hands gripping tightly",
    "Male hands with slight hair on knuckles", "Clean male hands with neatly trimmed nails",
    "Hands wearing a chunky resin ring", "Hands wearing a retro digital watch",
    "Hands with a chunky gold chain bracelet", "Veiny male hands wearing a distressed silver signet ring",
    "Clean male hands with neatly clipped nails adjusting watch crown", "Hands wearing a matte black titanium band",
    "Lean male hands with prominent wrist bone and subtle vein texture", "Skater hands with clean short nails and faint grip-tape dust",
    "Hands wearing a braided leather cord bracelet", "Hands with faint graphite smudge on index side",
    "Tan male hands wearing a stainless steel automatic dive watch"
];
export const POOL_HAND_MASCULINE = toWeighted(RAW_HAND_MASCULINE);

const RAW_HAND_NEUTRAL = [
    "Hands wearing Black Nitrile (Medical) Gloves", "Hands wearing White Cotton Archival Gloves",
    "Bare hands with slight dry skin texture", "Pale hands with blue veins visible",
    "Hands with a band-aid on the index finger", "Hands with ink smudges on the fingertips",
    "Neutral hands with neatly trimmed nails", "Hands wearing a simple black smartwatch",
    "Hands with dry knuckles and natural texture", "Short bitten fingernails, raw look",
    "Hands scattered with natural freckles", "Oily skin texture on fingers (Natural)",
    "Hands holding a car key loosely", "Hands with a black hair tie on wrist",
    "Wrinkled elderly hands with character", "Hands with a small healing papercut",
    "Palms with visible life lines", "Hands with a wooden beaded bracelet",
    "Hands with uneven cuticle texture", "Hands with a plaster on the thumb",
    "Hands with slight sunburn redness", "Hands with glitter residue on fingers",
    "Natural hands with clean short nails holding product securely", "Hands in soft natural daylight revealing skin pores and knuckles",
    "Hands with a fabric adhesive plaster on knuckle", "Relaxed open palm with natural lifelines catching sidelight",
    "Hands resting casually on a denim lap with natural micro-creases"
];
export const POOL_HAND_NEUTRAL = toWeighted(RAW_HAND_NEUTRAL);

export const getHandPoolForModel = (modelSelection: string) => {
    const s = modelSelection.toLowerCase();
    if (s.includes('boy') || s.includes('guy') || s.includes('pria') || s.includes('cowok') || s.includes('oppa')) {
        return POOL_HAND_MASCULINE;
    }
    if (s.includes('girl') || s.includes('wanita') || s.includes('cewek') || s.includes('hijab') || s.includes('muslimah') || s.includes('chindo') || s.includes('clean') || s.includes('y2k')) {
        return POOL_HAND_FEMININE;
    }
    return POOL_HAND_NEUTRAL;
};

const RAW_HAND_ACTIVITY = [
    "Squeezing the product bottle firmly", "Tapping the bottle cap with fingernail",
    "Unboxing with one hand, struggling slightly", "Holding product up against the sky",
    "Gripping the package edge tightly", "Tilting product to catch the light texture",
    "Rubbing product texture on back of hand", "Pointing at the logo with index finger",
    "Covering the barcode with thumb", "Lifting product slightly from table",
    "Pushing product forward into camera", "Rotating product slowly to show side",
    "Scratching the label edge absentmindedly", "Smoothing out the plastic wrapper",
    "Crushing the empty box after opening", "Holding product submerged in water",
    "Dipping index finger into product", "Swatching product on inner wrist",
    "Peeling off the safety seal", "Shaking the bottle vigorously",
    "Clutching product tightly in fist", "Resting hand casually on top of product",
    "Flicking the packaging", "Tracing the text on box with finger",
    "Holding product up to a light source", "Comparing two products side by side",
    "Catching the light with the bottle curve", "Squeezing tube from the very bottom",
    "Twisting the cap off in motion", "Pulling the tab open",
    "Ripping the plastic wrap off", "Poking the product surface (jelly/cream)",
    "Wiping a smudge off the bottle", "Holding product sideways",
    "Balancing product on open palm", "Hiding product behind hand then revealing",
    "Knocking on the container to show solidity", "Spinning the jar on the table",
    "Sliding product across the surface", "Picking up product from the floor",
    "Holding product near a window", "Blocking the sun with the product",
    "Clamping product between two fingers", "Dangling product by the lid",
    "Pressing the pump dispenser", "Scooping product with finger",
    "Smearing texture on skin", "Patting product into skin",
    "Washing product off hand", "Gripping with fingertips only (claw grip)",
    "Holding product against denim fabric", "Resting product on knee",
    "Holding product over a balcony ledge", "Aligning product with horizon line",
    "Holding product in front of a mirror", "Tossing product slightly in air",
    "Catching product", "Rolling product between palms",
    "Scratching a lottery ticket style motion", "Drumming fingers on product",
    "Holding product upside down", "Reading ingredients with finger trace",
    "Pulling product out of a messy bag", "Holding product against concrete wall",
    "Holding product over a cup of coffee", "Dipping product into water glass",
    "Squeezing gel onto fingertip", "Rubbing texture between thumb and index",
    "Holding product against a neon sign", "Placing product on a receipt",
    "Holding product with sleeve pulled over hand", "Gently caressing the packaging",
    "Struggling to open the lid (realistic)", "Holding product in rain",
    "Holding product in snow/ice", "Burying product in sand",
    "Holding product against a pet's fur", "Creating a shadow puppet with product",
    "Holding product against a laptop screen", "Product resting on open palm (Top down)",
    "Flipping the product in the air and catching it", "Wiping product off hand with a tissue",
    "Tapping product on a glass table", "Holding product inside a moving car",
    "Dropping product onto a soft surface", "Squeezing a half-empty tube hard",
    "Smudging product onto a mirror", "Peeling off a stubborn price tag",
    "Holding product while steering wheel is visible", "Dropping product into a tote bag",
    "Ripping open a cardboard delivery box", "Dipping a french fry into sauce",
    "Tearing a sugar packet open", "Holding product alongside a parking ticket",
    "Gently stretching the fabric neckline to demonstrate elastic recovery",
    "Rubbing the heavy cotton fleece texture between thumb and index finger",
    "Tilting the packaging to catch the metallic foil reflection in camera flash",
    "Flicking the metal zipper pull smoothly up and down the track",
    "Holding the garment fabric up against natural window light to test opacity",
    "Tracing the embroidered chest logo with index fingernail",
    "Gathering the shirt hem in one fist to demonstrate natural drape and drop",
    "Unzipping the jacket halfway with one hand while holding camera steady",
    "Tapping fingernail against the heavy glass container with a sharp click",
    "Draping the soft knitted fabric over forearm to show thickness and weight",
    "Pressing thumb firmly into the ribbed knit texture to show elasticity",
    "Turning the garment inside out to showcase clean interior seam stitching",
    "Peeling the protective seal strip slowly off the product label",
    "Rolling up the sleeve cuff twice to show inner contrast lining",
    "Resting one hand inside the garment pocket while adjusting fabric drape"
];
export const POOL_HAND_ACTIVITY = toWeighted(RAW_HAND_ACTIVITY);

const RAW_HAND_LOCATIONS = [
    { name: "MESSY BEDROOM DUVET", desc: "Crumpled white bed sheets, casual.", lighting: "Phone torch light (Close up, raw flash)", vibe: "Lazy Morning", weight: 8 },
    { name: "CAR PASSENGER SEAT", desc: "Denim jeans lap, dashboard in background.", lighting: "Harsh direct smartphone flash (High contrast, red-eye)", vibe: "On the Go", weight: 8 },
    { name: "BATHROOM SINK", desc: "Porcelain with water drops, slightly messy.", lighting: "Harsh yellow incandescent bulb with flash reflection", vibe: "Routine", weight: 6 },
    { name: "KITCHEN COUNTER", desc: "Granite counter, slightly cluttered with mugs.", lighting: "Bright overhead fluorescent (Even and flattering)", vibe: "Everyday", weight: 6 },
    { name: "CAFE TABLE (POV)", desc: "Marble table, coffee cup edge visible.", lighting: "Dim ambient cafe lighting with a sudden bright flash", vibe: "Aesthetic", weight: 8 },
    { name: "CONCRETE PAVEMENT", desc: "Street surface, gritty texture.", lighting: "Overcast soft flat lighting (Moody grey tones)", vibe: "Urban", weight: 4 },
    { name: "SUPERMARKET SHELF", desc: "Colorful blurred background of snacks.", lighting: "Bright, even fluorescent overhead (Clean and clear)", vibe: "Errands", weight: 6 },
    { name: "OFFICE DESK", desc: "Keyboard in background, post-it notes.", lighting: "Computer screen blue light on hands, dark office background", vibe: "Work", weight: 4 },
    { name: "GYM FLOOR", desc: "Black rubber mat texture, dumbbells.", lighting: "Harsh white fluorescent overhead (Deep shadows below objects)", vibe: "Active", weight: 4 },
    { name: "BEACH SAND", desc: "Textured sand, bright and sunny.", lighting: "Harsh midday sun (Deep dark shadows, lens flare)", vibe: "Summer", weight: 2 },
    { name: "LAUNDROMAT", desc: "Washing machine top spinning.", lighting: "Overcast daylight through storefront window (Soft, flat)", vibe: "Chore", weight: 2 },
    { name: "NEON ALLEYWAY", desc: "Wet asphalt road, gritty.", lighting: "Neon rim light (Pink/Cyan) with dark shadows", vibe: "Gritty", weight: 4 },
    { name: "VINTAGE CAR INTERIOR", desc: "Leather steering wheel background.", lighting: "Chiaroscuro (High contrast, deep shadows, single soft light)", vibe: "Wealth", weight: 2 },
    { name: "CLUB TABLE", desc: "Sticky table, dim crowded background.", lighting: "Club laser lights with motion-blurred flash", vibe: "Nightlife", weight: 2 },
    { name: "SUBWAY SEAT", desc: "Plastic seat pattern, hand strap.", lighting: "Flickering train fluorescent light (Cool and clinical)", vibe: "Commute", weight: 4 },
    { name: "LAPTOP KEYBOARD", desc: "Dusty keys, trackpad, dark room.", lighting: "Harsh blue screen glow (Underexposed background)", vibe: "Late Night", weight: 6 },
    { name: "SUPERMARKET FREEZER", desc: "Frosty glass door, frozen foods.", lighting: "Cold white LED from freezer (Harsh shadows)", vibe: "Errands", weight: 3 },
    { name: "PARK BENCH", desc: "Weathered wood grain, fallen leaves.", lighting: "Dappled sunlight through trees (High contrast spots)", vibe: "Autumn", weight: 4 },
    { name: "BUS STOP SEAT", desc: "Metal perforated seat, graffiti.", lighting: "Amber street lamp glow (Warm, moody shadows)", vibe: "Night Walk", weight: 3 },
    { name: "AIRPLANE TRAY", desc: "Plastic tray, tiny cup of water.", lighting: "Harsh overhead reading light (Spotlight effect)", vibe: "Travel", weight: 3 },
    { name: "CAR DASHBOARD TRAY", desc: "Dusty plastic texture, steering wheel edge.", lighting: "Passing streetlights (Moving shadows)", vibe: "On the Road", weight: 5 },
    { name: "KITCHEN SINK EDGE", desc: "Stainless steel, dish soap bubbles.", lighting: "Harsh overhead kitchen fluorescent", vibe: "Chores", weight: 4 },
    { name: "CASH REGISTER COUNTER", desc: "Barcode scanner glow, receipts.", lighting: "Sterile convenience store lighting", vibe: "Checkout", weight: 4 },
    { name: "BILLIARD TABLE", desc: "Green felt surface, chalk dust.", lighting: "Low hanging pool table lamp (Spotlight)", vibe: "Dive Bar", weight: 3 },
    { name: "SUPERMARKET CONVEYOR BELT", desc: "Black rubber belt texture, groceries.", lighting: "Bright grocery store fluorescents", vibe: "Errands", weight: 5 },
    { name: "MESSY GLOVE COMPARTMENT", desc: "Papers, old CDs, cramped.", lighting: "Tiny warm yellow bulb inside compartment", vibe: "Roadtrip", weight: 3 },
    { name: "JAPANESE MINIMARKET (WARMER SHELF)", desc: "Warm canned coffee drinks, red shelf trim.", lighting: "Warm golden warmer light mixed with cold fluorescent", vibe: "Late Night Tokyo", weight: 6 },
    { name: "DESIGN STUDIO WORKBENCH", desc: "Green cutting mat, fabric swatches, metal ruler.", lighting: "Articulated desk lamp direct beam on hands", vibe: "Maker Culture", weight: 6 },
    { name: "RECORD STORE VINYL CRATE", desc: "Vintage cardboard album sleeves, worn edges.", lighting: "Low-hanging warm amber pendant lamp", vibe: "Indie Nostalgia", weight: 4 },
    { name: "ROOFTOP SUNSET LEDGE", desc: "Textured concrete wall, distant skyscraper silhouette.", lighting: "Direct warm golden hour backlight with lens flare", vibe: "Golden Hour Chill", weight: 6 },
    { name: "AIRPORT DEPARTURE SEAT", desc: "Carry-on suitcase handle, boarding pass resting on knee.", lighting: "Diffused terminal glass-wall daylight", vibe: "Transit Jetlag", weight: 5 }
];
export const POOL_HAND_LOCATION: WeightedLocation[] = RAW_HAND_LOCATIONS;

const RAW_HAND_IMPERFECTION = [
    "Slight motion blur on thumb", "Out of focus background",
    "Fingerprint smudge on product", "Dust particles floating in air",
    "Hair stuck to product static", "Lint on sleeve fabric",
    "Dry skin visible on knuckles", "Hangnail visible",
    "Slightly overexposed flash hotspot", "Underexposed crushed shadows",
    "Grainy ISO noise", "Lens flare from flash",
    "Smudge on camera lens", "Crooked horizon line",
    "Cluttered background objects", "Messy cables in background",
    "Unmade bed in background", "Trash bin visible in corner",
    "Dirty fingernails (Slight)", "Chipped table paint",
    "Water droplets on lens", "Reflection of photographer in bottle",
    "Shadow of phone visible", "Uneven lighting",
    "Color cast (Yellow/Blue)", "Flash washout on label text",
    "Blurry product text", "Shaky hand capture",
    "Focus missed (on background)", "Cut off finger in frame",
    "Extra hand entering frame", "Pet fur on clothes",
    "Wrinkled sleeve fabric", "Loose thread on cuff",
    "Watch reflection glare", "Jewelry catching flash",
    "Skin texture pores visible", "Veins popping out",
    "Redness on skin", "Bandage edge peeling",
    "Coffee ring stain on table", "Crumbs on surface",
    "Scratches on product surface", "Dent in packaging",
    "Price tag residue", "Condensation droplets running down",
    "Grease spot on background", "Overwhelmed composition"
];
export const POOL_HAND_IMPERFECTION = toWeighted(RAW_HAND_IMPERFECTION);

// NEW: Lighting Styles Pool (To replace hardcoded flash in geminiService)
const RAW_LIGHTING_STYLES = [
    "Harsh direct flash (Paparazzi style, high contrast, red-eye)",
    "Soft diffused window light (Golden hour, warm, flattering)",
    "Moody neon glow (Cyberpunk vibe, red/blue/purple rim light)",
    "Fluorescent overhead (Convenience store/office, slightly green tint, unflattering)",
    "Dim ambient room light (Only illuminated by phone screen/TV glow)",
    "Overcast daylight (Flat, soft shadows, moody grey tones)",
    "Chiaroscuro (High contrast, deep shadows, single soft light source)",
    "Warm Tungsten (Cozy, dim, yellow-orange glow from a vintage lamp)",
    "Dappled sunlight (Shadows of leaves across face and clothes)",
    "Ring light reflection (Catchlights in eyes, beauty vlogger style)",
    "Streetlight glow (Orange sodium vapor light, cinematic night)",
    "Sunset backlight (Silhouette effect, warm lens flare)",
    "Harsh midday sun (Deep dark shadows under eyes and chin)",
    "Club laser lights (Chaotic, colorful streaks, motion blur)",
    "Fridge light glow (Cool white, illuminating face in dark room)",
    "Photobox booth light (Bright, even, slightly washed out)",
    "Direct smartphone torch flash (Close-up, raw shadow dropoff, authentic UGC)",
    "Bistro patio fairy lights (Warm scattered bokeh dots in dark background)",
    "Underground subway train tube lights (Cool clinical white, motion blur through window)",
    "Soft early morning blue hour daylight (Muted peaceful tones, gentle gradients)"
];
export const POOL_LIGHTING_STYLES = toWeighted(RAW_LIGHTING_STYLES);

// === 4. CAMERA ANGLE & FRAMING POOL ===
const RAW_CAMERA_ANGLES = [
    "0.5x Ultra-wide high angle (Viral TikTok selfie style, playful distorted perspective)",
    "Eye-level handheld snapshot (Direct, intimate, conversational eye-contact)",
    "Chest-level candid POV (Natural everyday distance, authentic social media feel)",
    "Slight low angle upward tilt (Empowering silhouette, elongating outfit lines)",
    "Over-the-shoulder POV perspective (Looking into mirror or at outfit details)",
    "Dutch angle (Subtle 10-degree tilted frame, dynamic spontaneous snapshot)",
    "Waist-level lookbook framing (Cropped at chin, emphasizing garment drape and fit)",
    "Close-up macro framing (Focus on fabric weave, texture, and hardware details)",
    "Hip-level low-angle snap (Street style candid, catching ground texture and walking motion)",
    "Elevator ceiling corner high-angle (Aesthetic retro surveillance mirror POV)",
    "Direct front-on flat snapshot (Amateur point-and-shoot camera framing)",
    "Three-quarter dynamic candid angle (Model caught mid-turn, natural perspective)"
];
export const POOL_CAMERA_ANGLE = toWeighted(RAW_CAMERA_ANGLES);

export const HUMAN_STYLE_POOLS: Record<string, WeightedItem[]> = {
    'TIKTOK_GIRL': toWeighted([
        "Hair: Messy Wolf Cut with bleached tips. Vibe: Y2K Grunge, oversized headphones around neck, deadpan expression.",
        "Hair: Slicked back greasy bun. Vibe: 'Clean Girl' but real, acne patch on cheek, oversized grey hoodie.",
        "Hair: Long messy waves with flyaways. Vibe: Coquette, pink ribbon in hair, crying makeup aesthetic.",
        "Hair: Hime cut (block bangs). Vibe: E-girl, heavy eyeliner, septum piercing, nonchalant.",
        "Hair: Messy bed hair, no brushing. Vibe: Rotting in bed, comfortable, oversized t-shirt, glasses.",
        "Hair: Two space buns (messy). Vibe: Festival aftermath, glitter on cheeks, tired eyes.",
        "Hair: Clip-in bangs (visible clip). Vibe: DIY haircut, chaotic energy, chewing gum.",
        "Hair: Dyed red hair, faded roots. Vibe: Indie sleaze, smudged mascara, leather jacket.",
        "Hair: Ponytail with scrunchie. Vibe: Gym rat, sweaty glow, redness on face, sporty.",
        "Hair: Bleached eyebrows. Vibe: High fashion amateur, weird angle, fish-eye lens effect.",
        "Hair: Ribbon braids. Vibe: Balletcore, leg warmers, sitting on floor.",
        "Hair: Wet hair look. Vibe: Fresh out of shower, towel on head, skincare routine.",
        "Hair: Messy layers with butterfly clips. Vibe: 2000s revival, colorful beads, chaotic room.",
        "Hair: Half-up half-down. Vibe: Library study session, stress acne, piles of books.",
        "Hair: Short bob with beanie. Vibe: Skater girl, baggy jeans, bruised knee.",
        "Hair: Long straight hair tucked in jacket. Vibe: Cold weather, red nose, scarf.",
        "Hair: Curly hair frizz halo. Vibe: Humidity, natural texture, no product.",
        "Hair: Bandana over hair. Vibe: Bad hair day, sunglasses inside, cool attitude.",
        "Hair: pigtails. Vibe: Irony, oversized graphic tee, eating chips.",
        "Hair: Messy top knot. Vibe: Exam season, dark circles, energy drink in hand.",
        "Hair: Soft layered wolf cut with curtain bangs. Vibe: Viral GRWM, bedroom mirror, oversized vintage graphic zip-up hoodie, candid head tilt.",
        "Hair: Tousled effortless bedhead bob. Vibe: Casual lip balm check, wired earbuds, oversized boxy tee, laughing mid-sentence.",
        "Hair: Voluminous 90s blowout with dynamic side sweep. Vibe: Vintage thrift haul, leather trench coat, confident candid strut.",
        "Hair: Bubble braided pigtails with elastic bands. Vibe: Y2K street style, baggy parachute pants, disposable camera flash."
    ]),
    'OPPA_KOREA': toWeighted([
        "Hair: Long Wolf Cut (Mullet) covering neck. Vibe: Edgy Rocker, eyebrow slit, piercings.",
        "Hair: Two-block cut with messy bangs (Comma hair). Vibe: Soft Boyfriend, oversized hoodie, glasses.",
        "Hair: Slightly wet look, brushed back. Vibe: Late night, unbuttoned shirt, flash photography.",
        "Hair: Messy bed hair (Perm). Vibe: Morning coffee, grey sweatpants, cozy.",
        "Hair: Buzz cut. Vibe: Military service leave, rebellious, streetwear.",
        "Hair: Bowl cut (Texture). Vibe: Nerd chic, thick rim glasses, library setting.",
        "Hair: Bleached blonde tips. Vibe: Idol trainee, practice room mirror, sweat.",
        "Hair: Long hair tied back. Vibe: Artist, paint on hands, apron.",
        "Hair: Middle part (Curtain bangs). Vibe: Classic, trench coat, city street.",
        "Hair: Cap worn backwards. Vibe: Street dancer, baggy cargo pants, sneakers.",
        "Hair: Beanie covering ears. Vibe: Winter date, puffer jacket, holding hot pack.",
        "Hair: Spiky messy hair. Vibe: 90s retro protagonist, band aid on nose.",
        "Hair: Wet hair towel dry. Vibe: Bathroom selfie, foggy mirror.",
        "Hair: Slicked side part. Vibe: Wedding guest, loosening tie, tired.",
        "Hair: Shaggy layers. Vibe: Indie band member, guitar case, smoking area (implied).",
        "Hair: Pink dyed hair. Vibe: Punk pop, colorful sweater, playground at night.",
        "Hair: Man bun (Messy). Vibe: Cafe owner, apron, rolling up sleeves.",
        "Hair: Textured shadow perm with feathered fringe. Vibe: Seongsu-dong streetwear, oversized boxy leather jacket, loose washed denim.",
        "Hair: Refined dandy cut with side parted fringe. Vibe: Minimalist architect, crisp white button-down, rimless glasses, leather tote.",
        "Hair: Wet-look textured messy perm. Vibe: Late night Seoul rainy street, umbrella reflections, streetlights, candid glance back.",
        "Hair: Clean high taper fade with natural textured top. Vibe: High-fashion streetwear, tactical crossbody sling, technical windbreaker."
    ]),
    'HIJAB_MUSLIMAH': toWeighted([
        "Style: Syar'i Layering (Pastel). Vibe: Feminine, garden background, soft natural light.",
        "Style: Hijab Segi Empat (Clean). Vibe: Office look, blazer, holding coffee, candid motion blur.",
        "Style: Malaysian Style (Bawal). Vibe: Neat draping, baju kurung, formal event, direct flash.",
        "Style: White Mukena (Prayer). Vibe: Spiritual, soft morning light, texture detail.",
        "Style: Batik Dress & Hijab. Vibe: Formal occasion, holding clutch, candid interaction.",
        "Style: Instant Sport Hijab. Vibe: Post-workout, sweaty glow, red face, natural.",
        "Style: Pashmina Silk (Flowy). Vibe: Kondangan outfit, elegant, flash photography, texture focus.",
        "Style: Simple Bergo (Daily). Vibe: Casual home setting, holding groceries, natural sunlight.",
        "Style: Draped Voile Bawal (Earth Tone). Vibe: Modest luxury, cream tailored abaya, soft natural courtyard lighting, graceful candid turn.",
        "Style: Layered Chiffon Pashmina (Clean Tucked). Vibe: Modern corporate executive, neutral trench coat, carrying leather tote, bright lobby.",
        "Style: Syar'i Layered Crepe in Dusty Mauve. Vibe: Feminine botanical garden walk, soft dappled morning sunlight, tranquil atmosphere.",
        "Style: Neat Segi Empat Paris Premium in Sand. Vibe: Aesthetic weekend brunch, crisp linen shirt, pearl hairpins on hijab side, candid smile.",
        "Style: Flowy Satin Silk Hijab in Champagne. Vibe: Formal wedding reception guest, structured modern kebaya, direct flash elegance.",
        "Style: Textured Crinkle Shawl draped loosely over shoulder. Vibe: Pottery studio date, oversized knit cardigan, warm earthy tones."
    ]),
    'HIJAB_CREATOR': toWeighted([
        "Style: Loose Pashmina (Meleyot). Vibe: Gen Z aesthetic, oversized shirt, headphones, messy room.",
        "Style: Turban & Big Earrings. Vibe: Edgy fashion, sunglasses, night street flash.",
        "Style: Hoodie over Inner Ninja. Vibe: Streetwear, cool attitude, city night background.",
        "Style: Pashmina Crinkle (Messy). Vibe: Cafe hangout, earth tones, laughing covering mouth.",
        "Style: Printed Scarf (Satin). Vibe: Brunch date, bright outfit, sunlight reflection.",
        "Style: Denim on Denim Hijab. Vibe: Casual street, tote bag, walking motion.",
        "Style: Monochrom Outfit. Vibe: Minimalist, aesthetic wall background, shadow play.",
        "Style: Leather Jacket & Black Pashmina. Vibe: Grunge aesthetic, neon alleyway, moody lighting.",
        "Style: Loose Pashmina Meleyot in Espresso Brown. Vibe: Gen Z coffee shop check, oversized bomber jacket, wired silver headphones, candid laugh.",
        "Style: Turban Wrap with Chunky Gold Hoop Earrings. Vibe: High-fashion editorial street, vintage trench coat, sunglasses, night flash.",
        "Style: Jersey Shawl wrapped tight with oversized zip-up hoodie. Vibe: Urban streetwear, cargo parachute pants, skatepark backdrop.",
        "Style: Crinkle Cotton Pashmina with Tortoiseshell Sunglasses on crown. Vibe: Senopati aesthetic brunch, boxy blazer, iced latte in hand.",
        "Style: Printed Silk Square Scarf tied vintage neck-wrap style. Vibe: Film camera thrift run, oversized denim jacket, retro cool.",
        "Style: Sleek Clean-Tuck Pashmina with high-neck ribbed knit. Vibe: Minimalist lookbook, clean white studio wall, sharp modern silhouette."
    ]),
    'REALISTIC_STREET': toWeighted([
        "Style: Batik Shirt (Loose). Vibe: Office worker lunch break, lanyard visible, holding iced tea.",
        "Style: Gojek/Grab Jacket (Open). Vibe: Resting on bike, smoking break, helmet on arm.",
        "Style: High School Uniform (Untucked). Vibe: After school hangout, backpack on one shoulder.",
        "Style: Kebaya Modern with Sneakers. Vibe: Wedding reception guest, tired feet.",
        "Style: Flannel Shirt tied around waist. Vibe: Concert queue, holding ticket.",
        "Style: Oversized Jersey. Vibe: Futsal aftermath, sweating, drinking water.",
        "Style: Batik Sarong & T-shirt. Vibe: Relaxing at porch, sandals, morning coffee.",
        "Style: Denim Jacket & Tote Bag. Vibe: Art gallery date, adjusting glasses.",
        "Style: Raincoat (Plastic). Vibe: Caught in rain, wet hair, holding umbrella.",
        "Style: Helm Proyek. Vibe: Site visit, dusty clothes, holding blueprint.",
        "Style: Masker Duckbill (Chin). Vibe: Commuter train, tired eyes, holding handstrap.",
        "Style: Safari Suit (PNS). Vibe: Monday morning, ID card, holding map.",
        "Style: Boxy Faded Graphic Tee & Loose Cargo Pants. Vibe: MRT underground concourse, waiting for train, earphones plugged in.",
        "Style: Vintage Bowling Shirt over White Ribbed Tank. Vibe: Kemang vinyl record cafe, relaxed laughing with friends, iced tea glass.",
        "Style: Casual Batik Shirt with modern slim collar & Chinos. Vibe: SCBD pedestrian crossing during lunch hour, lanyard tucked in pocket.",
        "Style: Oversized Workwear Canvas Jacket & Loose Denim. Vibe: Skate plaza bench, sneaker laces loose, candid snapshot mid-chat.",
        "Style: Lightweight Nylon Windbreaker & Crossbody Sling. Vibe: Caught in light tropical rain under cafe awning, phone in hand.",
        "Style: Modern Kebaya Encim paired with High-Waist Denim. Vibe: Cultural heritage district stroll, retro film camera around neck."
    ]),
    'CHINDO_ELEGANT': toWeighted([
        "Style: Tailored Minimalist Blazer & Silk Camisole. Vibe: Old Money luxury, Senopati cafe, clean gold jewelry, subtle natural glow.",
        "Style: Cashmere Cardigan draped over shoulders. Vibe: High-end PIK aesthetic, matcha latte on marble table, polished neat hair.",
        "Style: Elegant Pleated Midi Dress. Vibe: Upscale hotel lobby, understated designer bag, candid glancing away.",
        "Style: Crisp White Poplin Shirt & Linen Trousers. Vibe: Sunday brunch date, dainty wristwatch, effortlessly wealthy.",
        "Style: Monochrome Tweed Set. Vibe: Art gallery opening, subtle pearl earrings, sleek straight hair with center part.",
        "Style: Relaxed Silk Button-Down & High-Waist Denim. Vibe: Valet waiting area, iced Americano, sunglasses on head.",
        "Style: Knit Halter Top & Wide-Leg Slacks. Vibe: Rooftop lounge sunset, glass of sparkling water, soft golden hour glow.",
        "Style: Oversized Wool Coat & Turtle Neck. Vibe: Winter trip aesthetic, leather tote, immaculate styling.",
        "Style: Strapless Minimalist Linen Top with Gold Shell Pendant. Vibe: Beach club cabana, iced sparkling beverage, effortless sun-kissed charm.",
        "Style: Fine-Knit Charcoal Polo & Pleated Bermuda Shorts. Vibe: Country club terrace, tennis court backdrop, clean quiet luxury.",
        "Style: Silk Slip Dress with Tailored Boyfriend Blazer. Vibe: Upscale Italian restaurant, candlelight reflection, minimalist diamond pendant.",
        "Style: Cable-Knit Cream Sweater & Wide Linen Slacks. Vibe: Modern architectural villa porch, reading a magazine, serene morning air."
    ]),
    'CLEAN_GIRL': toWeighted([
        "Hair: Slicked back neat ballerina bun with center part. Vibe: Dewy glazed donut skin, chunky gold hoop earrings, white crewneck.",
        "Hair: Glossy smooth claw clip updo. Vibe: Fresh skincare glow, lip oil shine, oversized beige linen shirt.",
        "Hair: Effortless blowout with soft tucked ends. Vibe: Pilates aesthetic, holding green juice, bare fresh skin.",
        "Hair: Sleek low ponytail with middle part. Vibe: Minimalist chic, brushed up soap brows, neutral ribbed tank top.",
        "Hair: Damp-looking brushed back waves. Vibe: Post-shower skincare routine, dewy cheekbones, clean white towel around neck.",
        "Hair: Neat half-up twist with tortoiseshell clip. Vibe: Clean aesthetic bedroom, subtle gold necklace, minimal makeup.",
        "Hair: Smooth brushed-back bob tucked behind ears. Vibe: Architectural cafe, glass water bottle, fresh manicured nude nails.",
        "Hair: Natural airy texture with parted curtain bangs. Vibe: Morning sunlight in kitchen, warm mug, relaxed oatmeal sweater.",
        "Hair: Sleek high braided ponytail with gelled baby hairs. Vibe: Athleisure chic, matching espresso brown unitard, clean sneakers.",
        "Hair: Soft layered shoulder-length cut with healthy mirror shine. Vibe: Organic farmers market, canvas tote with fresh bread and flowers.",
        "Hair: French pin chignon with wispy temple strands. Vibe: Minimalist aesthetic vanity, applying lip balm, serene morning light.",
        "Hair: Tousled natural beach waves with sun-kissed highlights. Vibe: Coastal wellness walk, oversized cotton poplin shirt, bare skin."
    ]),
    'EDGY_Y2K': toWeighted([
        "Hair: Chunky blonde highlights with jagged baby bangs. Vibe: Cyber Y2K, wired earphones tangled, flash photography, tinted shades.",
        "Hair: Spiky bun with face-framing tendrils. Vibe: Retro club aftermath, glossy lips, low-rise cargo pants, gritty direct flash.",
        "Hair: Messy crimped waves with silver star clips. Vibe: Indie sleaze, smudged eyeliner, metallic shoulder bag, candid snapshot.",
        "Hair: Jet black pin-straight hair with micro-bangs. Vibe: 2000s MTV aesthetic, chunky belt, platform boots, harsh smartphone flash.",
        "Hair: Two high braided pigtails with zig-zag parting. Vibe: Y2K arcade night, bubblegum bubble, digital camera POV.",
        "Hair: Bleached platinum choppy layers. Vibe: Grunge pop, leather mini skirt, flash glare reflection on CD cover.",
        "Hair: Dip-dyed pink tips on dark bob. Vibe: Tokyo Shibuya street snapshot, layered silver chains, disposable camera look.",
        "Hair: Space buns with glitter gel parting. Vibe: Rave afterparty, oversized graphic jersey, fishnet wrist warmers, raw flash.",
        "Hair: Voluminous teased layers with trucker hat. Vibe: 2004 nostalgia, ribbed baby tee, low-slung denim, retro digital watch.",
        "Hair: Asymmetrical choppy bob with zig-zag clips. Vibe: Mall photobooth session, lip gloss wand in hand, high contrast flash."
    ]),
    'FACELESS_BODY': toWeighted([
        "Framing: Neck-down crop focused on upper body silhouette. Vibe: High-fashion lookbook, hands casually in pockets, showing fabric drape.",
        "Framing: Torso and waist focus, chin-up cropped out. Vibe: UGC outfit try-on, natural stance, showing texture and fit of the garment.",
        "Framing: Shoulders to thighs framing, head out of frame. Vibe: Mirror OOTD snapshot, one hand holding phone low, relaxed body posture.",
        "Framing: Chest-down angle with subtle walking movement. Vibe: Street style candid, natural fabric motion, clean textured background.",
        "Framing: Close-up torso framing with hands adjusting sleeve or hem. Vibe: Tactile fabric review, showing stitching detail and material weight.",
        "Framing: Low angle looking from waist up to collarbone (no face). Vibe: Editorial fit check, structured garment lines, minimalist setting.",
        "Framing: Side-profile torso framing showing garment silhouette from the side. Vibe: Clean profile fit-check, showcasing sleeve length and drop.",
        "Framing: Chest-to-hip front angle with one thumb hooked into pocket. Vibe: Casual lifestyle lookbook, showing garment stretch and posture.",
        "Framing: Back-of-neck down to mid-back crop. Vibe: Showing rear garment design, back print detail, and shoulder seam construction.",
        "Framing: 45-degree angled lookbook framing, cropped at collarbone. Vibe: High-end apparel lookbook, showing fabric sheen and stitching."
    ])
};

const RAW_HUMAN_LOCATIONS = [
    { name: "CAR INTERIOR (FLASH)", desc: "Inside car night. Sun visor mirror angle.", lighting: "Harsh direct flash (High contrast, red-eye, dash lights background)", vibe: "Intimate Drive", weight: 8 },
    { name: "ELEVATOR MIRROR", desc: "Metal elevator. Mirror Selfie.", lighting: "Fluorescent overhead with harsh phone flash starburst (Slightly greenish tint)", vibe: "OOTD Check", weight: 8 },
    { name: "STREET CORNER (NIGHT)", desc: "Wet asphalt, neon reflections. Dark bg.", lighting: "Direct hard flash (Paparazzi style, deep shadows behind subject)", vibe: "Paparazzi", weight: 6 },
    { name: "MESSY BEDROOM", desc: "Unmade bed, clothes pile. Pitch black room.", lighting: "Phone torch light (Close up, washed out face, dark room)", vibe: "Raw GRWM", weight: 8 },
    { name: "CAFE TABLE (POV)", desc: "Metal table. Red plastic stool visible.", lighting: "Dim ambient cafe lighting with a sudden bright flash (Amateur point-and-shoot)", vibe: "Date POV", weight: 8 },
    { name: "PARKING LOT BASEMENT", desc: "Concrete walls, pipes.", lighting: "Gritty fluorescent (Cool white/greenish) with motion-blurred flash", vibe: "Grunge Industrial", weight: 4 },
    { name: "SUPERMARKET AISLE", desc: "Colorful shelves. Candid wide angle.", lighting: "Bright, even fluorescent overhead (Flat, unflattering shadows)", vibe: "Late Night Snack", weight: 6 },
    { name: "BATHROOM MIRROR", desc: "Dirty mirror, toothpaste spots.", lighting: "Harsh yellow incandescent bulb with flash reflection in mirror", vibe: "Realist Selfie", weight: 8 },
    { name: "ESCALATOR (DOWN)", desc: "Looking down, metal steps.", lighting: "Mall lighting (Diffused, slightly warm overhead)", vibe: "Transit", weight: 4 },
    { name: "ROOFTOP LEDGE", desc: "City lights background (Bokeh). Wind blowing hair.", lighting: "Streetlight orange sodium glow with soft fill flash", vibe: "Melancholy", weight: 2 },
    { name: "CONVENIENCE STORE", desc: "Holding drink.", lighting: "Fridge light glow (Cool white illuminating face in dark store)", vibe: "Chill", weight: 6 },
    { name: "BUS STOP (RAIN)", desc: "Wet glass, street lights blurry. Umbrella.", lighting: "Moody neon and amber streetlights (Cyberpunk rim light)", vibe: "Waiting", weight: 4 },
    { name: "OFFICE CUBICLE", desc: "Monitor glow, messy desk. Post-it notes.", lighting: "Computer screen blue light on face, dark office background", vibe: "Overtime", weight: 4 },
    { name: "GYM MIRROR", desc: "Gym equipment bg. Sweaty.", lighting: "Harsh white fluorescent overhead (Deep shadows under eyes)", vibe: "Workout", weight: 6 },
    { name: "STAIRWELL", desc: "Echoey concrete stairs.", lighting: "Emergency exit red/green glow with deep black shadows", vibe: "Liminal Space", weight: 2 },
    { name: "BALCONY RAIL", desc: "Sunset sky, drying clothes bg. candid.", lighting: "Golden hour sunset backlight (Warm silhouette, lens flare)", vibe: "Home", weight: 4 },
    { name: "TRAIN CARRIAGE", desc: "Subway seats, hand straps. Motion blur window.", lighting: "Flickering train fluorescent light (Cool and clinical)", vibe: "Commute", weight: 4 },
    { name: "FITTING ROOM", desc: "Curtain bg. Clothes pile.", lighting: "Unflattering overhead spotlight (Strong top-down shadows)", vibe: "Try-on", weight: 6 },
    { name: "LIBRARY STACKS", desc: "Rows of books, dust motes. Quiet.", lighting: "Soft diffused window light through dust (Warm, muted)", vibe: "Study", weight: 2 },
    { name: "LAUNDROMAT", desc: "Washing machine spinning blur. Tiled floor.", lighting: "Overcast daylight through storefront window (Soft, flat)", vibe: "Chore", weight: 2 },
    { name: "COUNTRY CLUB LOUNGE", desc: "Leather armchairs. Old money.", lighting: "Warm tungsten (Cozy, dim, yellow-orange glow from a vintage lamp)", vibe: "Luxury", weight: 4 },
    { name: "VINTAGE CAR INTERIOR", desc: "Wood paneling, leather steering wheel. Cinematic.", lighting: "Chiaroscuro (High contrast, deep shadows, single soft light)", vibe: "Wealth", weight: 2 },
    { name: "NEON ALLEYWAY", desc: "Puddles reflecting pink/cyan neon. Cyberpunk.", lighting: "Neon rim light (Pink/Cyan) with dark shadows", vibe: "Gritty", weight: 4 },
    { name: "SERVER ROOM", desc: "Blinking server lights, dark corridor. Tech.", lighting: "Blinking LED indicators (Red/Blue/Green dots of light in pitch black)", vibe: "Cyber", weight: 2 },
    { name: "DINGY MOTEL ROOM", desc: "Floral bedspread, CRT TV.", lighting: "Dim warm lamp with harsh camera flash", vibe: "Cinematic", weight: 3 },
    { name: "HOSPITAL WAITING ROOM", desc: "Blue plastic chairs, sterile environment.", lighting: "Flickering cool white LED (Bleak, flat)", vibe: "Somber", weight: 1 },
    { name: "FAST FOOD BOOTH", desc: "Plastic table, half-eaten burger, neon signs.", lighting: "Harsh mixed lighting (Window daylight + neon glow)", vibe: "Late Night", weight: 4 },
    { name: "MUDDY FESTIVAL GROUND", desc: "Tents in background, muddy boots visible.", lighting: "Overcast grey sky, flat lighting", vibe: "Grunge", weight: 2 },
    { name: "CLUB BATHROOM", desc: "Graffiti on mirror, low light.", lighting: "Harsh neon pink/blue overhead, dirty mirror flash", vibe: "Night Out", weight: 5 },
    { name: "AQUARIUM TUNNEL", desc: "Sharks swimming overhead, dark.", lighting: "Deep blue bioluminescent glow from tanks", vibe: "Surreal", weight: 2 },
    { name: "FLIGHT CABIN", desc: "Small oval window, sleeping passengers.", lighting: "Dim cabin lights with harsh reading light beam", vibe: "Travel", weight: 4 },
    { name: "BACKSEAT OF A RIDESHARE", desc: "Street lights moving past the window, blurry.", lighting: "Passing amber streetlights (Moving shadows)", vibe: "Late Night Transit", weight: 5 },
    { name: "NIGHT MARKET STALL", desc: "Smoke from grill, crowded background.", lighting: "Harsh bare incandescent bulb (Warm, high contrast)", vibe: "Street", weight: 4 },
    { name: "ATM VESTIBULE", desc: "Glass doors, tiled floor, empty.", lighting: "Clinical fluorescent white (Cold, isolating)", vibe: "Liminal", weight: 3 },
    { name: "AIRPORT LUGGAGE CAROUSEL", desc: "Bags moving, weary travelers.", lighting: "High ceiling industrial lights (Flat, slightly green)", vibe: "Exhaustion", weight: 3 },
    { name: "THRIFT STORE RACK", desc: "Cluttered hangers, vintage clothes.", lighting: "Mismatched fluorescent tubes (Warm and cool mixed)", vibe: "Indie", weight: 4 },
    { name: "PHOTOBOOTH INTERIOR", desc: "Red curtain background, tight space.", lighting: "Direct frontal flash (Flat, highly flattering, blown out)", vibe: "Candid", weight: 5 },
    { name: "SMOKING AREA ALLEY", desc: "Cigarette butts on ground, brick wall.", lighting: "Dim wall sconce (Shadowy, moody)", vibe: "Break Time", weight: 3 },
    { name: "GAS STATION PUMP", desc: "Car in background, pump handle.", lighting: "Overhead canopy LED (Bright, sterile, dark background)", vibe: "Roadtrip", weight: 4 },
    { name: "MALL FOOD COURT", desc: "Plastic trays, out of focus crowds.", lighting: "Diffused skylight mixed with neon store signs", vibe: "Casual", weight: 3 },
    { name: "MRT SUBWAY PLATFORM (MODERN)", desc: "Sleek sliding platform glass doors, yellow tactile paving, modern transit signage.", lighting: "Cool overhead recessed LED strips with crisp metallic reflections", vibe: "Modern Commute", weight: 6 },
    { name: "MINIMALIST CONCRETE ART GALLERY", desc: "Polished concrete floor, white cubic bench, blank high walls.", lighting: "Diffused museum track spotlighting with subtle soft shadow gradients", vibe: "Quiet Luxury", weight: 6 },
    { name: "VINTAGE BOUTIQUE FITTING ROOM", desc: "Deep emerald velvet curtain, warm parquet flooring, antique brass mirror frame.", lighting: "Flattering warm side vanity tungsten lights (No harsh top shadows)", vibe: "Try-On Chic", weight: 6 },
    { name: "SEOUL ROOFTOP SKYLINE CAFE", desc: "Glass railing, distant sunset over city towers, low minimalist concrete table.", lighting: "Golden hour sunset glow casting warm silhouettes with soft ambient fill", vibe: "Golden Hour Glow", weight: 6 },
    { name: "TOKYO IZAKAYA LANTERN ALLEY", desc: "Narrow alley, hanging red glowing paper lanterns, wooden sliding lattice door.", lighting: "Warm amber and crimson lantern glow with deep shadowy contrasts", vibe: "Midnight Tokyo", weight: 5 },
    { name: "GLASSHOUSE BOTANICAL CAFE", desc: "Monstera leaves, hanging ferns, cast-iron greenhouse frames, weathered terracotta tiles.", lighting: "Natural diffused sunlight through patterned glass ceiling panes", vibe: "Serene Botanical", weight: 6 },
    { name: "VINYL RECORD LISTENING BOOTH", desc: "Headphone stand, wooden shelving stacked with album spines, warm turntable light.", lighting: "Cozy dim amber spotlight directly illuminating subject, moody dark perimeter", vibe: "Indie Chill", weight: 5 },
    { name: "NIGHT STREET FOOD STALL WITH STEAM", desc: "Metal folding table, plastic stools, hot vapor steam swirling from cooking pot.", lighting: "Bare hanging incandescent bulb casting warm high-contrast highlights through steam", vibe: "Street Night", weight: 5 }
];
export const POOL_HUMAN_LOCATION: WeightedLocation[] = RAW_HUMAN_LOCATIONS;

const RAW_HUMAN_ACTIVITY = [
    "Applying lip gloss while looking into a mirror/phone", "Laughing covering mouth with one hand (shy)",
    "Fixing a hair flyaway or tucking hair behind ear", "Holding a coffee cup/drink, looking away bored",
    "Checking phone with a cracked screen", "Shielding eyes from the harsh flash light with hand",
    "Adjusting the collar/clothing, looking down", "Waving goodbye or doing a peace sign blurrily",
    "Eating a slice of pizza messily", "Fixing glasses on nose bridge",
    "Tying shoelaces (crouched)", "Holding a burning cigarette (or lollipop)",
    "Taking a photo of food (POV)", "Yawning covering mouth",
    "Stretching arms overhead", "Leaning against wall looking tired",
    "Digging through tote bag", "Applying pimple patch",
    "Drinking from a straw (awkward)", "Holding hands with someone (out of frame)",
    "Pointing at menu/sign", "Rubbing sleepy eyes",
    "Sneezing (mid-action)", "Laughing throwing head back",
    "Holding a cat/dog awkwardly", "Adjusting face mask",
    "Putting on earrings", "Checking watch/time",
    "Biting fingernail (nervous)", "Flipping hair back",
    "Holding heavy shopping bags", "Texting with both thumbs",
    "Applying eye drops", "Eating cup noodles",
    "Holding umbrella in wind", "Zipping up jacket",
    "Brushing crumbs off shirt", "Putting hair in ponytail",
    "Cleaning glasses with shirt", "Applying hand sanitizer",
    "Adjusting a silk tie or collar", "Holding a crystal glass of sparkling water",
    "Reading a vintage newspaper", "Looking out a rainy window thoughtfully",
    "Pulling up a dark hood", "Looking at a glowing screen reflection on face",
    "Exhaling vapor/smoke in the cold", "Adjusting a silver watch",
    "Blowing a bubble with chewing gum (popping)", "Tying hair into a messy bun with a scrunchie",
    "Wiping sweat off forehead with back of hand", "Staring blankly at a laptop screen",
    "Putting a stray hair strand in mouth", "Holding a lighter flame to the camera",
    "Peeling a sticker off a piece of fruit", "Squinting at a distant street sign",
    "Picking teeth with a toothpick", "Shaking out an umbrella",
    "Zipping a duffel bag shut", "Coughing into elbow",
    "Checking teeth in phone selfie camera", "Blowing on hot coffee",
    "Licking icing off a finger", "Stretching neck side to side",
    "Pumping gas into a car", "Swiping a subway card",
    "Typing furiously on a mechanical keyboard", "Lighting a candle with a match",
    "Twirling a pen absentmindedly", "Putting a quarter into a vending machine",
    "Fixing makeup using the car sun-visor mirror", "Fanning self with a folded magazine",
    "Struggling to open a stubborn plastic wrapper", "Wiping phone screen with shirt hem",
    "Tapping credit card on the table impatiently", "Adjusting a rear-view mirror",
    "Untangling wired earphones", "Applying hand cream slowly",
    "Picking a piece of lint off pants", "Holding a half-eaten burger",
    "Shaking a spray paint can", "Zipping up a jacket in the cold",
    "Taking a selfie with a digital camera", "Biting the cap off a pen",
    "Tucking a loose hair strand behind ear while smiling down shyly",
    "Adjusting sunglasses on nose bridge while checking phone notifications",
    "Unzipping jacket collar halfway to reveal inner layering",
    "Holding an iced matcha cup while checking wristwatch with a slight tilt",
    "Leaning casually against subway handrail while listening to earphones",
    "Shaking hair out loosely after removing an umbrella",
    "Casually hooking thumb into belt loop while talking to someone off-camera",
    "Inspecting sleeve cuff texture absentmindedly while waiting",
    "Sipping drink through a straw while maintaining direct eye contact",
    "Reaching into jacket inner pocket to grab car keys",
    "Adjusting shoulder strap of canvas tote bag mid-stride",
    "Checking reflection in a dark storefront glass window"
];
export const POOL_HUMAN_ACTIVITY = toWeighted(RAW_HUMAN_ACTIVITY);

const RAW_HUMAN_IMPERFECTION = [
    "Red-eye effect from flash", "Motion blur on hand moving",
    "Hair stuck to lip gloss", "Mascara smudge under eye",
    "Acne patch visible on chin", "Oily T-zone reflection",
    "Double chin angle (slight)", "Flyaway hairs static",
    "Bra strap showing accidentally", "Lint on black clothes",
    "Wrinkled shirt", "Food stain on corner of mouth",
    "Chapped lips texture", "Foundation separating on nose",
    "Uneven eyeliner", "Band-aid on finger",
    "Bruise on knee/arm", "Tan line visible",
    "Sweat stains on collar", "Messy room background visible",
    "Unmade bed in background", "Trash bin in corner of frame",
    "Photographer's shadow visible", "Flash glare on glasses",
    "Awkward hand posture", "Eyes half closed (blinking)",
    "Mouth slightly open (breathing)", "Bad posture (slouching)",
    "Phone reflection in sunglasses", "Dirty mirror spots",
    "Cluttered desk background", "Person walking past in blur",
    "Overexposed forehead", "Underexposed background",
    "Grainy low light noise", "Color cast green (fluorescent)",
    "Lens smudge effect", "Crooked horizon angle",
    "Cut off top of head", "Focus missed (on ear instead of eye)",
    "Subtle phone screen reflection visible in pupils",
    "Earring catching a sharp flash sparkle",
    "Denim waistband natural creasing from movement",
    "Tiny stray eyelash on cheek",
    "Watch crystal catching slight flash glare",
    "Faint blush on cheeks from outdoor temperature",
    "Single loose thread on jacket hemline",
    "Slight motion blur on swinging shoulder handbag",
    "T-shirt collar slightly askew showing collarbone",
    "Natural faint freckles on nose bridge"
];
export const POOL_HUMAN_IMPERFECTION = toWeighted(RAW_HUMAN_IMPERFECTION);

// === 5. VIDEO GENERATION POOLS ===

const RAW_CAMERA_AMATEUR = [
    "Static tripod shot with dynamic human and fabric movement in frame",
    "Casual handheld follow pan tracking subject's movement",
    "Natural handheld micro-shake with authentic social media vlog rhythm",
    "Subtle breathing sway handheld with steady subject framing",
    "Dutch angle snapshot hold with natural handheld stability",
    "POV chest-level shot following subject's hands and garment drape",
    "Low angle table-top phone perspective looking up at subject moving naturally",
    "Stable handheld framing with organic micro-adjustments following gestures",
    "Static wide shot as subject walks naturally forward into medium close-up",
    "Subtle handheld breathing motion with organic tilt responding to posture",
    "Slow casual follow tracking behind walking subject (maintaining consistent back perspective)",
    "Eye-level handheld walking glide pacing alongside subject",
    "Smooth handheld tilt-down tracking from face to outfit hemline motion",
    "Subtle handheld push-in accentuating garment fabric texture and fold physics"
];
export const POOL_CAMERA_AMATEUR = toWeighted(RAW_CAMERA_AMATEUR);

const RAW_CAMERA_CINEMATIC = [
    "Smooth cinematic slow push-in tracking subject's natural expressions",
    "Smooth parallel tracking dolly pacing alongside walking subject",
    "Slow optical zoom-in highlighting garment texture with cinematic background bokeh",
    "Precise rack focus from background street environment to outfit details",
    "Gentle horizontal dolly pan tracking subject's stride",
    "Low angle upward tilt tracking confident walking stride and silhouette",
    "Over-the-shoulder perspective with gentle gimbal stabilization",
    "Smooth slow pull-back revealing surrounding environment while subject walks",
    "Elevated three-quarter cinematic glide maintaining consistent subject angle",
    "Cinematic slow-motion 60fps tracking pan capturing natural hair and fabric sway",
    "Smooth 30-degree subtle semi-arc glide highlighting garment drape without turning around",
    "Low-angle dynamic tracking shot gliding alongside walking subject",
    "Gentle 35-degree dynamic orbital track accentuating fabric flow while keeping subject angled towards camera",
    "Precise optical rack focus from background environment to outfit zipper and chest print",
    "Slow smooth jib crane-down from eye level to waist level following subject movement"
];
export const POOL_CAMERA_CINEMATIC = toWeighted(RAW_CAMERA_CINEMATIC);

export const resolveCameraMotion = (locationDesc: string, chaosLevel: number): { label: string, isCinematic: boolean } => {
    const desc = locationDesc.toLowerCase();
    const isDark = desc.includes('night') || desc.includes('dark') || desc.includes('dim') || desc.includes('basement') || desc.includes('club') || desc.includes('neon') || desc.includes('black') || desc.includes('fluorescent');

    // Modern AI video models handle low-light motion cleanly; we scale motion organically with chaosLevel
    const useCinematic = Math.random() > 0.45;
    if (useCinematic) {
        return { label: pickWeightedRandom(POOL_CAMERA_CINEMATIC, chaosLevel).label, isCinematic: true };
    } else {
        return { label: pickWeightedRandom(POOL_CAMERA_AMATEUR, chaosLevel).label, isCinematic: false };
    }
};

const RAW_VIDEO_ARTIFACTS = [
    "Clean 4k, no artifacts", "Slight motion blur on fast movements",
    "Heavy motion blur, low shutter speed look", "Auto-focus hunting (blurring in and out)",
    "Digital noise in dark areas (high ISO)", "Rolling shutter distortion (jello effect) on fast pan",
    "Lens flare from a passing light source", "Sudden exposure shift (auto-exposure adjusting)",
    "Compression artifacts (blocky pixels) in shadows", "Color banding in the sky/background",
    "Dust particles visible floating in the light", "Smudged lens effect (soft glow around lights)",
    "Dropped frames (slight stutter)", "Flickering fluorescent lights in the background",
    "Vignetting (dark corners)", "Chromatic aberration (color fringing) on edges",
    "Overexposed highlights blowing out", "Underexposed subject, silhouette effect",
    "White balance shifting mid-shot", "Flash firing randomly",
    "Natural rolling shutter micro-sway on movement",
    "Subtle ISO noise grain in deep shadow folds",
    "Lens flare bloom when angled towards ambient light source",
    "Slight frame exposure pulse mimicking smartphone auto-exposure"
];
export const POOL_VIDEO_ARTIFACTS = toWeighted(RAW_VIDEO_ARTIFACTS);

// === 6. HELPER TO GET STYLE KEY ===
export const mapModelToStyleKey = (modelSelection: string): string => {
    const s = modelSelection.toLowerCase();
    
    // Faceless / Body Only
    if (s.includes('faceless') || s.includes('body only')) return 'FACELESS_BODY';

    // Hijab Styles
    if (s.includes('creator') || s.includes('pashmina') || s.includes('trendy')) return 'HIJAB_CREATOR';
    if (s.includes('muslimah') || s.includes('syari') || s.includes('hijab')) return 'HIJAB_MUSLIMAH';
    
    // Korean / Oppa
    if (s.includes('korean') || s.includes('oppa')) return 'OPPA_KOREA';
    
    // Chindo Luxury / Elegant
    if (s.includes('chindo')) return 'CHINDO_ELEGANT';

    // Specific Viral Aesthetics
    if (s.includes('clean girl')) return 'CLEAN_GIRL';
    if (s.includes('y2k')) return 'EDGY_Y2K';
    
    // Street / Local Male & General
    if (s.includes('lokal') || s.includes('street') || s.includes('boy') || s.includes('guy') || s.includes('pria') || s.includes('cowok')) return 'REALISTIC_STREET';
    
    return 'TIKTOK_GIRL'; 
};
