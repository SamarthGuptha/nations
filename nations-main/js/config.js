export const PLAYER_COLORS = [
    {name:"Crimson", color:"#b8342c"},
    {name:"Azure", color:"#2f6db5"},
    {name:"Verdant", color:"#3e7f42"},
    {name: "Amber", color: "#d99524"},
    {name: "Violet", color: "#7a4a9c"},
    {name: "Slate", color: "#5b6470"},
];
export const NATION_NAMES = ["Redwood", "Blue Hollow", "Violet Vine","Green Grass","White Walls", "Grey Ground"];
export const RESOURCES = {
    steel: {label: "Steel", icon: "⛏"},
    potato: {label: "Potato", icon: "🥔"},
    titanium: {label: "Titanium", icon: "◆"},
    uranium: {label: "Uranium", icon: "☢"},
    troops: {label:"Troops", icon: "⚔"},
};
export const BUILDABLES = {
    steelFarm: { label: "Steel Farm", icon: "⛏", cost: { potato: 2 }, yield: { steel: 2 }, points: 1 },
    potatoFarm: { label: "Potato Farm", icon: "🥔", cost: { steel: 2 }, yield: { potato: 2 }, points: 1 },
    titaniumFarm: { label: "Titanium Farm", icon: "◆", cost: { steel: 3 }, yield: { titanium: 1 }, points: 2 },
    uraniumMine: { label: "Uranium Mine", icon: "☢", cost: { titanium: 2, steel: 2 }, yield: { uranium: 1 }, points: 3 },
    troops: { label: "Troops (+3)", icon: "⚔", cost: { potato: 2 }, yield: null, points: 0, troops: 3 },
    city: { label: "City", icon: "🏰", cost: { steel: 4, titanium: 2 }, yield: { steel: 1, potato: 1 }, points: 4 },
};
export const SLICE_TYPES = {
    steel: { label: "Steel",kind: "resource", resource: "steel", amount: 3, color: "#8e9aa6", good: true },
    potato: { label: "Potato",kind: "resource", resource: "potato", amount: 3, color: "#c58a3d", good: true },
    titanium: { label: "Titanium",kind: "resource", resource: "titanium", amount: 2, color: "#6f8ea8", good: true },
    uranium: { label: "Uranium",kind: "resource", resource: "uranium", amount: 1, color: "#7fae4a", good: true },
    jackpot: { label: "JACKPOT", kind: "jackpot", color: "#e8b437", good: true },
    freeTroop: { label: "Free Troop", kind: "troop", amount: 3, color: "#b8342c", good: true },
    neutral: { label: "Nothing", kind: "neutral", color: "#cdb98a", good: true },
    respin: { label: "Re-spin", kind: "respin", color: "#4f9f9a", good: true },
    disaster: { label: "Disaster", kind: "disaster", color: "#4a3520", good: false, bad: true },
    blight: { label: "Blight", kind: "blight", color: "#3d2a3f", good: false, bad: true },
};
export function makeStartingWheel() {
    return [
        "steel", "potato", "steel", "titanium",
        "potato", "disaster", "uranium", "jackpot",
        "potato", "disaster", "steel", "neutral",
    ].map((type, i) => ({ id: `s${i}`, type, size: 1 }));
}
export const MAP_COLS = 5;
export const TERRITORY_NAMES = [
    "Name 1","Name 1","Name 1","Name 1","Name 1",
    "Name 1","Name 1","Name 1","Name 1","Name 1",
    "Name 1","Name 1","Name 1","Name 1","Name 1",
];
export function neighborsOf(index) {
    const cols = MAP_COLS;
    const rows = Math.ceil(TERRITORY_NAMES.length / cols);
    const r = Math.floor(index / cols);
    const c = index % cols;
    const out = [];
    if (c > 0)out.push(index - 1);
    if (c < cols-1) out.push(index+1);
    if (r > 0)out.push(index-cols);
    if (r < rows-1)out.push(index+cols);
    return out.filter((i) => i >= 0 && i<TERRITORY_NAMES.length);
}
