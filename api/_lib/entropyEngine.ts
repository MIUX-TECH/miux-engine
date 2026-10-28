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

// --- PLAN B: SEMANTIC ACTIVITY PARTITIONING (WEARABLE / PACKAGING / UNIVERSAL) ---
export const RAW_HAND_ACTIVITY_WEARABLE = [
    "Gently stretching the fabric neckline to demonstrate elastic recovery",
    "Rubbing the heavy cotton fleece texture between thumb and index finger",
    "Flicking the metal zipper pull smoothly up and down the track",
    "Holding the garment fabric up against natural window light to test opacity",
    "Tracing the embroidered chest logo with index fingernail",
    "Gathering the shirt hem in one fist to demonstrate natural drape and drop",
    "Unzipping the jacket halfway with one hand while holding camera steady",
    "Turning the garment inside out to showcase clean interior seam stitching",
    "Draping the soft knitted fabric over forearm to show thickness and weight",
    "Pressing thumb firmly into the ribbed knit texture to show elasticity",
    "Rolling up the sleeve cuff twice to show inner contrast lining",
    "Resting one hand inside the garment pocket while adjusting fabric drape",
    "Inspecting the collar ribbing and stitching reinforcement up close",
    "Stretching the ribbed hemline lightly to show recovery and retention",
    "Holding up the garment by shoulder seams to display silhouette",
    "Brushing palm over fabric surface to highlight matte texture and weave",
    "Pinching a fold of the material to show fabric thickness and hand-feel",
    "Fastening a metal snap button with a satisfying click motion",
    "Checking the woven brand tag and size label with thumb",
    "Smoothly sliding fingers along the side seam to show flatlock stitching"
];

export const RAW_HAND_ACTIVITY_PACKAGING = [
    "Tilting the packaging to catch the metallic foil reflection in camera flash",
    "Tapping fingernail against the heavy glass container with a sharp click",
    "Peeling the protective seal strip slowly off the product label",
    "Squeezing tube from the very bottom to show formula flow",
    "Pressing the pump dispenser smoothly onto fingertip",
    "Twisting the cap off in fluid motion with one hand",
    "Swatching product texture smoothly on inner wrist",
    "Rubbing serum or cream texture between thumb and index finger",
    "Catching the light with the bottle curve and glass thickness",
    "Lifting product slightly from table to show bottom label and batch code",
    "Rotating product slowly to show clean typography on the side",
    "Smoothing out the outer matte paper box wrapper",
    "Unboxing with one hand carefully revealing inner packaging",
    "Balancing product upright on open palm to demonstrate size",
    "Poking the product surface (balm/cream) to show rich texture",
    "Wiping a tiny smudge off the glossy bottle surface",
    "Holding bottle upright near window to show liquid level and clarity",
    "Opening compact magnetic closure with an audible snap",
    "Displaying applicator wand or dropper slowly pulling out",
    "Tracing the embossed logo typography with index finger"
];

export const RAW_HAND_ACTIVITY_UNIVERSAL = [
    "Tilting product to catch the light and surface texture",
    "Rotating product slowly to show 360 profile and side details",
    "Holding product up against natural window light",
    "Lifting product cleanly from table into camera focus",
    "Pointing at the logo or key detail with index finger",
    "Resting product on open palm (casual top-down POV)",
    "Pushing product slightly forward into camera lens",
    "Holding product firmly with fingertips showing scale against hand",
    "Resting hand casually beside product on clean surface",
    "Unboxing with one hand revealing product contents",
    "Sliding product smoothly across the table surface",
    "Holding product in front of a mirror reflection",
    "Holding product while resting elbow casually on table",
    "Comparing product scale comfortably held in one hand",
    "Picking up product casually as if about to use it",
    "Holding product inside a car with daylight catching edge",
    "Placing product cleanly down on surface with gentle touch",
    "Holding product angled slightly to avoid glare on logo",
    "Holding product casually while thumb rests along side edge",
    "Flipping product to reveal rear details cleanly"
];

// PLAN A: Reordered so high-value tactile fashion & product UGC interactions are in the top 60% (Weight = 8)
const RAW_HAND_ACTIVITY = [
    // --- TOP TIER (0.0 - 0.60): WEIGHT 8 (High Priority Tactile UGC) ---
    ...RAW_HAND_ACTIVITY_WEARABLE,
    ...RAW_HAND_ACTIVITY_PACKAGING,
    ...RAW_HAND_ACTIVITY_UNIVERSAL,
    // --- MID TIER (0.60 - 0.90): WEIGHT 4 (Authentic Contextual Hand Actions) ---
    "Holding product with sleeve pulled over hand casually",
    "Gripping package edge securely against denim lap",
    "Holding product against concrete wall texture",
    "Pulling product carefully out of a canvas tote bag",
    "Resting hand casually on top of product package",
    "Lifting product from table while talking off-camera",
    "Covering barcode casually with thumb",
    "Holding product over a coffee table surface",
    "Flicking packaging corner lightly with finger",
    "Tracing embossed text along edge with thumb",
    "Placing product next to everyday essentials (keys/wallet)",
    "Holding product near a cafe window catching warm ambient light",
    // --- LOWER TIER (0.90 - 1.00): WEIGHT 2 (Rare / Playful Variations) ---
    "Balancing product playfully between fingertips",
    "Dropping product gently onto soft duvet surface",
    "Dangling product casually by loop or strap",
    "Tapping product base lightly on wooden tabletop"
];

export const POOL_HAND_ACTIVITY_WEARABLE = toWeighted([...RAW_HAND_ACTIVITY_WEARABLE, ...RAW_HAND_ACTIVITY_UNIVERSAL]);
export const POOL_HAND_ACTIVITY_PACKAGING = toWeighted([...RAW_HAND_ACTIVITY_PACKAGING, ...RAW_HAND_ACTIVITY_UNIVERSAL]);
export const POOL_HAND_ACTIVITY_UNIVERSAL = toWeighted(RAW_HAND_ACTIVITY_UNIVERSAL);
export const POOL_HAND_ACTIVITY = toWeighted(RAW_HAND_ACTIVITY);

export const getHandActivityPool = (isWearable?: boolean): WeightedItem[] => {
    if (isWearable === true) return POOL_HAND_ACTIVITY_WEARABLE;
    if (isWearable === false) return POOL_HAND_ACTIVITY_PACKAGING;
    return POOL_HAND_ACTIVITY;
};

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

// ============================================================================
// [PLAN G: RESERVED & DISABLED LIGHTING POOL - DO NOT REMOVE]
// POOL_LIGHTING_STYLES is kept here for future custom studio illumination pipelines.
// It is intentionally disabled in default generation to prevent conflicting lighting
// directives against the ambient lighting already embedded in POOL_*_LOCATION.
// ============================================================================
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
// PLAN D: Generalized camera angles without hard-coded environmental dependencies
const RAW_CAMERA_ANGLES = [
    "0.5x Ultra-wide high angle (Viral TikTok selfie style, playful distorted perspective)",
    "Eye-level handheld snapshot (Direct, intimate, conversational eye-contact)",
    "Chest-level candid POV (Natural everyday distance, authentic social media feel)",
    "Slight low angle upward tilt (Empowering silhouette, elongating outfit lines)",
    "Over-the-shoulder POV perspective (Looking at garment details and texture)",
    "Dutch angle (Subtle 10-degree tilted frame, dynamic spontaneous snapshot)",
    "Waist-level lookbook framing (Cropped at chin, emphasizing garment drape and fit)",
    "Close-up macro framing (Focus on fabric weave, texture, and hardware details)",
    "Hip-level low-angle snap (Street style candid, catching ground texture and walking motion)",
    "High-angle corner perspective (Aesthetic retro surveillance / candid overhead POV)",
    "Direct front-on flat snapshot (Amateur point-and-shoot camera framing)",
    "Three-quarter dynamic candid angle (Model caught mid-turn, natural perspective)"
];
export const POOL_CAMERA_ANGLE = toWeighted(RAW_CAMERA_ANGLES);

// PLAN C: Dedicated camera angles for Faceless / Body Only mode (Zero face/eye-contact demands)
const RAW_CAMERA_ANGLES_FACELESS = [
    "Waist-level lookbook framing (Cropped at chin, emphasizing garment drape and fit)",
    "Chest-level candid POV (Natural torso distance, authentic social media feel, head cropped out)",
    "Slight low angle upward tilt (Empowering silhouette, elongating outfit lines, chin cropped)",
    "Close-up macro framing (Focus on fabric weave, texture, and hardware details)",
    "Hip-level low-angle snap (Street style candid, catching ground texture and walking motion)",
    "Over-the-shoulder POV perspective (Looking at garment details and texture)",
    "Three-quarter dynamic candid angle (Torso caught mid-turn, natural fit perspective, no face)",
    "Dutch angle waist framing (Subtle 10-degree tilted frame, dynamic spontaneous outfit snapshot)",
    "Direct front-on torso snapshot (Amateur point-and-shoot camera framing focused on garment fit)",
    "Neck-down lookbook framing (High-end apparel lookbook perspective, hands casually placed)"
];
export const POOL_CAMERA_ANGLE_FACELESS = toWeighted(RAW_CAMERA_ANGLES_FACELESS);

export const getCameraAnglePool = (isFaceless: boolean = false): WeightedItem[] => {
    return isFaceless ? POOL_CAMERA_ANGLE_FACELESS : POOL_CAMERA_ANGLE;
};

// PLAN E: Talent Personas sanitized of clashing outerwear so user's product remains primary
export const HUMAN_STYLE_POOLS: Record<string, WeightedItem[]> = {
    'TIKTOK_GIRL': toWeighted([
        "Hair: Messy Wolf Cut with bleached tips. Vibe: Y2K Grunge, oversized headphones around neck, deadpan expression.",
        "Hair: Slicked back greasy bun. Vibe: 'Clean Girl' but real, acne patch on cheek, casual demeanor.",
        "Hair: Long messy waves with flyaways. Vibe: Coquette, pink ribbon in hair, crying makeup aesthetic.",
        "Hair: Hime cut (block bangs). Vibe: E-girl, heavy eyeliner, septum piercing, nonchalant.",
        "Hair: Messy bed hair, no brushing. Vibe: Rotting in bed, comfortable, glasses, candid morning look.",
        "Hair: Two space buns (messy). Vibe: Festival aftermath, glitter on cheeks, tired eyes.",
        "Hair: Clip-in bangs (visible clip). Vibe: DIY haircut, chaotic energy, chewing gum.",
        "Hair: Dyed red hair, faded roots. Vibe: Indie sleaze, smudged mascara, layered silver chains, candid flash.",
        "Hair: Ponytail with scrunchie. Vibe: Gym rat, sweaty glow, redness on face, sporty.",
        "Hair: Bleached eyebrows. Vibe: High fashion amateur, weird angle, fish-eye lens effect.",
        "Hair: Ribbon braids. Vibe: Balletcore, sitting comfortably on floor, soft expression.",
        "Hair: Wet hair look. Vibe: Fresh out of shower, skincare routine, dewy natural skin.",
        "Hair: Messy layers with butterfly clips. Vibe: 2000s revival, colorful beads, candid energy.",
        "Hair: Half-up half-down. Vibe: Library study session, stress acne, piles of books.",
        "Hair: Short bob with beanie. Vibe: Skater girl, relaxed fit denim, bruised knee.",
        "Hair: Long straight hair with soft texture. Vibe: Cold weather, red cheeks, oversized knitted scarf.",
        "Hair: Curly hair frizz halo. Vibe: Humidity, natural texture, no product.",
        "Hair: Bandana over hair. Vibe: Bad hair day, sunglasses on head, cool attitude.",
        "Hair: Pigtails with baby hairs. Vibe: Playful, eating chips, candid direct flash.",
        "Hair: Messy top knot. Vibe: Exam season, dark circles, energy drink in hand.",
        "Hair: Soft layered wolf cut with curtain bangs. Vibe: Viral GRWM, bedroom vanity mirror, wired earphones, candid head tilt.",
        "Hair: Tousled effortless bedhead bob. Vibe: Casual lip balm check, wired earbuds, laughing mid-sentence.",
        "Hair: Voluminous 90s blowout with dynamic side sweep. Vibe: Vintage thrift haul, tortoise sunglasses, confident candid strut.",
        "Hair: Bubble braided pigtails with elastic bands. Vibe: Y2K street style, disposable camera flash."
    ]),
    'OPPA_KOREA': toWeighted([
        "Hair: Long Wolf Cut (Mullet) covering neck. Vibe: Edgy Rocker, eyebrow slit, piercings.",
        "Hair: Two-block cut with messy bangs (Comma hair). Vibe: Soft Boyfriend, thick frame glasses, relaxed coffee shop.",
        "Hair: Slightly wet look, brushed back. Vibe: Late night, flash photography, candid side profile.",
        "Hair: Messy bed hair (Perm). Vibe: Morning coffee, relaxed lounge aesthetic, cozy.",
        "Hair: Buzz cut. Vibe: Military service leave, rebellious, urban streetwear.",
        "Hair: Bowl cut (Texture). Vibe: Nerd chic, thick rim glasses, library setting.",
        "Hair: Bleached blonde tips. Vibe: Idol trainee, dance studio mirror, light sweat.",
        "Hair: Long hair tied back. Vibe: Artist, paint on hands, minimalist rings.",
        "Hair: Classic middle part curtain bangs. Vibe: Minimalist city street walk, leather crossbody messenger, candid look back.",
        "Hair: Cap worn backwards. Vibe: Street dancer, clean retro sneakers, natural swagger.",
        "Hair: Ribbed beanie pushed back. Vibe: Street date, iced Americano in hand, silver rings, casual stance.",
        "Hair: Spiky messy hair. Vibe: 90s retro protagonist, band aid on nose.",
        "Hair: Wet hair towel dry. Vibe: Bathroom selfie, foggy mirror, post-shower fresh.",
        "Hair: Slicked side part. Vibe: Evening event attendee, loosening collar button, relaxed tired charm.",
        "Hair: Shaggy layers. Vibe: Indie band member, guitar case, moody ambient light.",
        "Hair: Pink dyed hair. Vibe: Punk pop, colorful beads, urban playground at night.",
        "Hair: Man bun (Messy). Vibe: Artisanal cafe barista, silver ear cuffs, rolling up sleeves.",
        "Hair: Textured shadow perm with feathered fringe. Vibe: Seongsu-dong streetwear, minimalist silver chain, loose washed denim.",
        "Hair: Refined dandy cut with side parted fringe. Vibe: Minimalist architect, rimless glasses, leather tote.",
        "Hair: Wet-look textured messy perm. Vibe: Late night Seoul rainy street, umbrella reflections, streetlights, candid glance back.",
        "Hair: Clean high taper fade with natural textured top. Vibe: High-fashion streetwear, tactical crossbody sling, matte black sunglasses."
    ]),
    'HIJAB_MUSLIMAH': toWeighted([
        "Style: Syar'i Layering (Pastel). Vibe: Feminine, botanical garden background, soft natural light.",
        "Style: Hijab Segi Empat (Clean). Vibe: Office look, minimalist lanyard, holding coffee, candid motion blur.",
        "Style: Crisp Malaysian Bawal Clean Curve in Dusty Rose. Vibe: Modest aesthetic event, dainty wristwatch, soft warm flash.",
        "Style: Flowy Soft Chiffon Hijab in Warm Sand. Vibe: Modest lifestyle creator, natural morning window light, delicate pearl brooch.",
        "Style: Elegant Segi Empat Voile in Muted Olive. Vibe: Formal occasion guest, metallic clutch in hand, poised candid posture.",
        "Style: Instant Sport Hijab. Vibe: Post-workout, sweaty glow, red face, natural.",
        "Style: Pashmina Silk (Flowy). Vibe: Kondangan guest, elegant drape, flash photography, texture focus.",
        "Style: Simple Bergo (Daily). Vibe: Casual home setting, holding groceries, natural sunlight.",
        "Style: Draped Voile Bawal (Earth Tone). Vibe: Modest luxury aesthetic, minimalist jewelry, soft natural courtyard lighting, graceful candid turn.",
        "Style: Layered Chiffon Pashmina (Clean Tucked) in Espresso. Vibe: Modern creative professional, minimalist leather shoulder bag, bright lobby lighting.",
        "Style: Syar'i Layered Crepe in Dusty Mauve. Vibe: Feminine botanical garden walk, soft dappled morning sunlight, tranquil atmosphere.",
        "Style: Neat Segi Empat Paris Premium in Sand. Vibe: Aesthetic weekend brunch, pearl hairpins on hijab side, candid smile.",
        "Style: Flowy Satin Silk Hijab in Champagne. Vibe: Formal evening event guest, dainty gold necklace, direct flash elegance.",
        "Style: Textured Crinkle Shawl draped loosely over shoulder. Vibe: Pottery studio date, warm earthy tones, natural sidelight."
    ]),
    'HIJAB_CREATOR': toWeighted([
        "Style: Loose Pashmina (Meleyot). Vibe: Gen Z aesthetic, wired headphones around neck, messy room.",
        "Style: Turban & Big Earrings. Vibe: Edgy fashion, sunglasses, night street flash.",
        "Style: Sleek Inner Ninja with baseball cap. Vibe: Modern urban streetwear, cool attitude, city night background.",
        "Style: Pashmina Crinkle (Messy). Vibe: Cafe hangout, earth tones, laughing covering mouth.",
        "Style: Printed Scarf (Satin). Vibe: Brunch date, radiant sunlight reflection, cheerful energy.",
        "Style: Draped Denim-Hue Hijab. Vibe: Casual street, canvas tote bag, walking motion.",
        "Style: Monochrome Dark Pashmina. Vibe: Minimalist, aesthetic concrete wall background, shadow play.",
        "Style: Textured Matte Black Pashmina with silver ring accents. Vibe: Grunge street aesthetic, chunky silver chains, neon alleyway lighting.",
        "Style: Loose Pashmina Meleyot in Espresso Brown. Vibe: Gen Z coffee shop check, wired silver headphones, candid laugh, iced latte in hand.",
        "Style: Turban Wrap with Chunky Gold Hoop Earrings. Vibe: High-fashion editorial street, vintage sunglasses, night flash.",
        "Style: Sleek Jersey Shawl wrapped tight. Vibe: Urban street creator, baggy parachute cargo pants, skatepark backdrop.",
        "Style: Crinkle Cotton Pashmina with Tortoiseshell Sunglasses on crown. Vibe: Senopati aesthetic brunch, iced latte in hand.",
        "Style: Printed Silk Square Scarf tied chic neck-wrap style. Vibe: Film camera thrift run, vintage sunglasses on crown, canvas tote bag.",
        "Style: Sleek Clean-Tuck Pashmina with silver choker. Vibe: Minimalist lookbook, clean white studio wall, sharp modern silhouette."
    ]),
    'REALISTIC_STREET': toWeighted([
        "Hair: Clean side-parted crop. Vibe: Office worker lunch break, company lanyard visible, holding iced tea cup.",
        "Hair: Tousled short textured crop. Vibe: Urban commuter taking a breather, helmet resting on scooter seat, iced tea in hand.",
        "Hair: Casual middle-part curtain bangs. Vibe: Youth street style, canvas backpack on one shoulder, relaxed student aesthetic.",
        "Hair: Textured half-up messy bun. Vibe: Weekend social gathering, retro sneakers, candid laughter.",
        "Hair: Flannel tied casually around waist. Vibe: Music concert queue, holding festival wristband.",
        "Hair: Short athletic buzz fade. Vibe: Futsal aftermath, refreshing with water, athletic glow.",
        "Hair: Casual relaxed bedhead. Vibe: Morning coffee on open porch, warm ceramic mug, relaxed candid smile.",
        "Hair: Messy natural fringe. Vibe: Urban transit stop, compact nylon crossbody sling, earphones plugged in.",
        "Hair: Damp tousled hair catching light. Vibe: Sheltering from tropical drizzle under cafe awning, compact umbrella in hand.",
        "Hair: Clean low taper fade with natural top. Vibe: Creative studio designer, holding rolled architectural prints, rugged field watch.",
        "Hair: Duckbill mask pulled down to chin. Vibe: Commuter train platform, tired evening eyes, phone in hand.",
        "Hair: Neat classic comb-over with light pomade. Vibe: Urban professional on lunch break, ID lanyard around neck, minimalist wristwatch.",
        "Hair: Textured French crop. Vibe: MRT underground concourse, waiting for train, earphones plugged in.",
        "Hair: Natural effortless waves. Vibe: Kemang vinyl record cafe, relaxed laughing with friends, iced glass.",
        "Hair: Neat tapered gentleman's cut. Vibe: SCBD pedestrian crossing during lunch hour, lanyard tucked in pocket, takeaway coffee cup.",
        "Hair: Short messy textured styling. Vibe: Skate plaza bench, loose vintage washed denim, canvas tote beside feet.",
        "Hair: Sleek low chignon bun with silver hairpin. Vibe: Cultural heritage district stroll, retro film camera around neck."
    ]),
    'CHINDO_ELEGANT': toWeighted([
        "Hair: Silky smooth center-parted blowout. Vibe: Old Money luxury, Senopati cafe, clean gold jewelry, subtle natural glow.",
        "Hair: Polished neat low bun with claw clip. Vibe: High-end PIK aesthetic, matcha latte on marble table, pearl earrings.",
        "Hair: Gentle salon blowout with curtain bangs. Vibe: Upscale hotel lobby, understated designer handbag, candid glancing away.",
        "Hair: Sleek straight hair tucked behind ears. Vibe: Sunday brunch date, dainty wristwatch, effortlessly wealthy aura.",
        "Hair: Sleek glass-shine straight hair with center part. Vibe: Art gallery opening, subtle pearl earrings, dainty Cartier watch.",
        "Hair: Relaxed waves with tortoiseshell sunglasses on head. Vibe: Valet waiting area, iced Americano in hand.",
        "Hair: Soft textured updo with face tendrils. Vibe: Rooftop lounge sunset, glass of sparkling water, golden hour glow.",
        "Hair: Polished low ponytail with velvet ribbon. Vibe: High-end transit aesthetic, structured leather tote, immaculate grooming.",
        "Hair: Sun-kissed natural wavy hair. Vibe: Beach club cabana, iced sparkling beverage, effortless coastal charm.",
        "Hair: Clean side-swept blow dry. Vibe: Country club terrace, tennis court backdrop, clean quiet luxury.",
        "Hair: Soft Hollywood waves swept over one shoulder. Vibe: Upscale dining lounge, candlelight reflection, minimalist diamond pendant.",
        "Hair: Relaxed morning bedhead with silk scrunchie. Vibe: Modern architectural villa porch, reading a magazine, serene morning air."
    ]),
    'CLEAN_GIRL': toWeighted([
        "Hair: Slicked back neat ballerina bun with center part. Vibe: Dewy glazed donut skin, chunky gold hoop earrings, fresh minimalist aesthetic.",
        "Hair: Glossy smooth claw clip updo. Vibe: Fresh skincare glow, lip oil shine, dainty chain necklace.",
        "Hair: Effortless blowout with soft tucked ends. Vibe: Pilates aesthetic, holding green juice, bare fresh skin.",
        "Hair: Sleek low ponytail with middle part. Vibe: Minimalist chic, brushed up soap brows, delicate gold hoops.",
        "Hair: Damp-looking brushed back waves. Vibe: Post-shower skincare routine, dewy cheekbones, clean natural skin.",
        "Hair: Neat half-up twist with tortoiseshell clip. Vibe: Clean aesthetic bedroom, subtle gold necklace, minimal makeup.",
        "Hair: Smooth brushed-back bob tucked behind ears. Vibe: Architectural cafe, glass water bottle, fresh manicured nude nails.",
        "Hair: Natural airy texture with parted curtain bangs. Vibe: Morning sunlight in kitchen, warm mug, relaxed mood.",
        "Hair: Sleek high braided ponytail with gelled baby hairs. Vibe: Athleisure chic, clean white sneakers, focused candid look.",
        "Hair: Soft layered shoulder-length cut with healthy mirror shine. Vibe: Organic farmers market, canvas tote with fresh flowers.",
        "Hair: French pin chignon with wispy temple strands. Vibe: Minimalist aesthetic vanity, applying lip balm, serene morning light.",
        "Hair: Tousled natural beach waves with sun-kissed highlights. Vibe: Coastal wellness walk, clean glowing skin, sea breeze."
    ]),
    'EDGY_Y2K': toWeighted([
        "Hair: Chunky blonde highlights with jagged baby bangs. Vibe: Cyber Y2K, wired earphones tangled, flash photography, tinted shades.",
        "Hair: Spiky bun with face-framing tendrils. Vibe: Retro club aftermath, glossy lips, baggy parachute pants, gritty direct flash.",
        "Hair: Messy crimped waves with silver star clips. Vibe: Indie sleaze, smudged eyeliner, metallic shoulder bag, candid snapshot.",
        "Hair: Jet black pin-straight hair with micro-bangs. Vibe: 2000s MTV aesthetic, chunky grommet belt, platform shoes, harsh smartphone flash.",
        "Hair: Two high braided pigtails with zig-zag parting. Vibe: Y2K arcade night, bubblegum bubble, digital camera POV.",
        "Hair: Bleached platinum choppy layers. Vibe: Grunge pop, silver waist chains, flash glare reflection on CD cover.",
        "Hair: Dip-dyed pink tips on dark bob. Vibe: Tokyo Shibuya street snapshot, layered silver chains, disposable camera look.",
        "Hair: Space buns with glitter gel parting. Vibe: Rave afterparty, oversized graphic tee, fishnet wrist warmers, raw flash.",
        "Hair: Voluminous teased layers with trucker hat. Vibe: 2004 nostalgia, low-slung denim, retro digital watch.",
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

// --- PLAN B: HUMAN ACTIVITY PARTITIONING (WEARABLE & UNIVERSAL) ---
export const RAW_HUMAN_ACTIVITY_WEARABLE = [
    "Hooking thumb casually into belt loop or pocket while shifting stance",
    "Adjusting jacket collar or neckline while looking down casually",
    "Unzipping jacket halfway to reveal inner layering",
    "Inspecting sleeve cuff texture absentmindedly while waiting",
    "Checking outfit reflection in a dark storefront glass window",
    "Smoothing hemline of the garment while walking mid-stride",
    "Resting one hand inside jacket or pant pocket with relaxed posture",
    "Shrugging shoulders lightly to show relaxed oversized shoulder drop",
    "Turning slowly at 45-degree angle to showcase garment drape",
    "Light casual walk forward towards camera showing natural fabric sway",
    "Brushing a speck of lint off sleeve or pants with natural movement",
    "Adjusting shoulder strap of canvas tote bag without hiding outfit chest",
    "Casually buttoning or unbuttoning front closure while mid-conversation",
    "Reaching into pocket casually to retrieve phone",
    "Crossing arms loosely across chest showing sleeve fit and drape",
    "Gently pulling sleeve down over knuckles in relaxed pose",
    "Adjusting waistband or belt while looking aside",
    "Stepping forward to catch sidelight across outfit texture"
];

export const RAW_HUMAN_ACTIVITY_UNIVERSAL = [
    "Tucking a loose hair strand behind ear while smiling down shyly",
    "Adjusting sunglasses on nose bridge while checking phone notifications",
    "Holding an iced matcha or coffee cup while checking wristwatch",
    "Laughing covering mouth with one hand (shy candid moment)",
    "Leaning casually against subway handrail while listening to earphones",
    "Texting with both thumbs with focused casual expression",
    "Checking wristwatch with a slight head tilt",
    "Looking out a window thoughtfully catching ambient sidelight",
    "Sipping drink through a straw while looking towards camera",
    "Flipping hair back loosely over shoulder",
    "Sitting casually on a cafe chair with relaxed posture",
    "Waving lightly or greeting someone off-camera with a gentle smile",
    "Untangling wired earphones while waiting",
    "Applying lip balm casually using phone screen as mirror",
    "Stretching arms lightly in a relaxed candid break",
    "Walking mid-stride with natural candid momentum",
    "Resting chin on palm while listening attentively",
    "Shielding eyes lightly from direct sunlight with hand",
    "Fixing glasses frame on nose bridge while glancing down",
    "Checking teeth or smile subtly in phone selfie camera"
];

// PLAN A: Reordered so wearable fashion & high-converting lifestyle UGC gestures receive Weight 8
const RAW_HUMAN_ACTIVITY = [
    // --- TOP TIER (0.0 - 0.60): WEIGHT 8 (High Priority Wearable & UGC Gestures) ---
    ...RAW_HUMAN_ACTIVITY_WEARABLE,
    ...RAW_HUMAN_ACTIVITY_UNIVERSAL,
    // --- MID TIER (0.60 - 0.90): WEIGHT 4 (Authentic Contextual Everyday Actions) ---
    "Putting on small hoop earrings while checking reflection",
    "Holding umbrella in light drizzle while checking phone",
    "Digging through canvas tote bag for keys",
    "Tying hair into a loose messy bun with scrunchie",
    "Applying hand cream slowly into fingers",
    "Holding a crystal glass of sparkling water on table",
    "Fanning self gently with folded cafe menu",
    "Adjusting car rearview mirror before driving",
    "Tapping transport card at subway turnstile",
    "Shaking water droplets off folding umbrella",
    // --- LOWER TIER (0.90 - 1.00): WEIGHT 2 (Rare Lifestyle Quirks) ---
    "Twirling a pen absentmindedly while studying",
    "Blowing lightly on hot coffee before taking a sip",
    "Looking up at street signs while navigating"
];

export const POOL_HUMAN_ACTIVITY_WEARABLE = toWeighted([...RAW_HUMAN_ACTIVITY_WEARABLE, ...RAW_HUMAN_ACTIVITY_UNIVERSAL]);
export const POOL_HUMAN_ACTIVITY_UNIVERSAL = toWeighted(RAW_HUMAN_ACTIVITY_UNIVERSAL);
export const POOL_HUMAN_ACTIVITY = toWeighted(RAW_HUMAN_ACTIVITY);

export const getHumanActivityPool = (isWearable?: boolean): WeightedItem[] => {
    if (isWearable === false) return POOL_HUMAN_ACTIVITY_UNIVERSAL;
    return POOL_HUMAN_ACTIVITY_WEARABLE;
};

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
