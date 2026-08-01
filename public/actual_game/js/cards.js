import {SLICE_TYPES} from "./config.js";
let uid = 1000;
const newId = () => `s${uid++}`;
export const DRAFT_CARDS = [
    {
        id: "eraser",
        name: "The Eraser",
        icon: "🧽",
        tag: "Cleanse",
        desc: "Turn every Disaster slice on your wheel into a harmless Neutral slice.",
        apply: (p) => {
            let n = 0;
            p.wheel.forEach((s) => {
                if (s.type === "disaster") { s.type = "neutral"; n++; }
            });
            return n ? `Erased ${n} Disaster slice(s).` : "No Disasters left to erase.";
        },
    },
    {
        id: "goldenTicket",
        name: "The Golden Ticket",
        icon: "🎟",
        tag: "Fortune",
        desc: "Double the physical size of all Jackpot slices. If you have none, gain one.",
        apply: (p) => {
            const jacks = p.wheel.filter((s) => s.type === "jackpot");
            if (!jacks.length) {
                p.wheel.push({ id: newId(), type: "jackpot", size: 2 });
                return "Added a large Jackpot slice.";
            }
            jacks.forEach((s) => (s.size *= 2));
            return `Jackpot slices doubled in size (${jacks.length}).`;
        },
    },
    {
        id: "deflector",
        name: "The Deflector",
        icon: "🔄",
        tag: "Tempo",
        desc: "Add a Re-spin slice: landing on it grants an immediate free spin.",
        apply: (p) => {
            p.wheel.push({ id: newId(), type: "respin", size: 1 });
            return "A Re-spin slice was forged.";
        },
    },
    {
        id: "targetedGrowth",
        name: "Targeted Growth",
        icon: "🌱",
        tag: "Convert",
        desc: "Replace every Bad slice on your wheel with a Free Troop slice.",
        apply: (p) => {
            let n = 0;
            p.wheel.forEach((s) => {
                if (SLICE_TYPES[s.type].bad) { s.type = "freeTroop"; n++; }
            });
            return n ? `${n} bad slice(s) became Free Troops.` : "Your wheel held no bad slices.";
        },
    },
    {
        id: "saboteur",
        name: "Saboteur",
        icon: "🗡",
        tag: "Attack",
        desc: "Add a Blight slice to the wheel of the current 1st-place nation.",
        apply: (p, game) => {
            const leader = game.leader();
            const victim = leader && leader.id !== p.id ? leader : game.livingPlayers().find((x) => x.id !== p.id);
            if (!victim) return "No rival to sabotage.";
            victim.wheel.push({ id: newId(), type: "blight", size: 1 });
            return `${victim.nation} was blighted.`;
        },
    },
    {
        id: "prospector",
        name: "The Prospector",
        icon: "⛏",
        tag: "Economy",
        desc: "Add a fat Steel slice and a Titanium slice to your wheel.",
        apply: (p) => {
            p.wheel.push({ id: newId(), type: "steel", size: 1.6 });
            p.wheel.push({ id: newId(), type: "titanium", size: 1 });
            return "Two mining slices added.";
        },
    },
    {
        id: "reactor",
        name: "Reactor Core",
        icon: "☢",
        tag: "Economy",
        desc: "Add two Uranium slices — the road to heavy industry.",
        apply: (p) => {
            p.wheel.push({ id: newId(), type: "uranium", size: 1 });
            p.wheel.push({ id: newId(), type: "uranium", size: 1 });
            return "Uranium slices added.";
        },
    },
    {
        id: "warDrums",
        name: "War Drums",
        icon: "🥁",
        tag: "Military",
        desc: "Add a large Free Troop slice and gain 3 troops now.",
        apply: (p) => {
            p.wheel.push({ id: newId(), type: "freeTroop", size: 1.5 });
            p.resources.troops += 3;
            return "The drums beat: +3 troops.";
        },
    },
    {
        id: "shrinkRay",
        name: "Shrink Ray",
        icon: "🔻",
        tag: "Cleanse",
        desc: "Halve the size of every bad slice on your wheel.",
        apply: (p) => {
            let n = 0;
            p.wheel.forEach((s) => {
                if (SLICE_TYPES[s.type].bad) { s.size = Math.max(0.25, s.size / 2); n++; }
            });
            return n ? `${n} bad slice(s) shrunk.` : "Nothing bad to shrink.";
        },
    },
];
export function drawDraftHand(count = 3) {
    const pool=[...DRAFT_CARDS];
    const hand=[];
    while (hand.length < count && pool.length) {hand.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);}
    return hand;
}

export function cardById(id) {
    return DRAFT_CARDS.find((c) => c.id === id);
}