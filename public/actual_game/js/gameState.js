import { PLAYER_COLORS, NATION_NAMES, BUILDABLES, SLICE_TYPES, TERRITORY_NAMES, makeStartingWheel, neighborsOf } from "./config.js";

export function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

const clampPlayers = (n) => Math.max(2, Math.min(6, n|0));

export class GameState {
    constructor(playerCount = 4, playerNames = []) {
        this.players = [];
        this.board = Array(15).fill({});
        this.globalState = {
            round: 1,
            waiting_on: [],
            finished_waiting: []
        };
        this.phase = "spin";
        this.buildsRemaining = 0;
        this.spinsRemaining = 1;
        this.lastSpin = null;
        this.attackMode = false;
        this.selectedTerritory = null;
        this.draftHand = [];
        this.log = [];
        this.currentIndex = 0;

        this.reset(playerCount, playerNames);
    }
    reset(playerCount = 4, playerNames = []) {
        const count = clampPlayers(playerCount);
        this.players = [];
        this.board = Array(15).fill({});
        this.globalState = { round: 1, waiting_on: [], finished_waiting: [] };

        for (let i = 0; i < count; i++) {
            this.players.push({
                id: `p${i}`,
                name: playerNames[i] || NATION_NAMES[i] || `Player ${i + 1}`,
                nation: playerNames[i] || NATION_NAMES[i] || `Nation ${i + 1}`,
                color: PLAYER_COLORS[i] ? PLAYER_COLORS[i].color : "#fff",
                alive: true,
                structuresSinceDraft: 0,
                steel: 4, potato: 4, titanium: 1, uranium: 0, troops: 6,
                steelFarm: 0, potatoFarm: 0, titaniumFarm: 0, uraniumMine: 0, city: 0,
                wheel: makeStartingWheel(),
            });
            this.globalState.waiting_on.push(`p${i}`);
        }
        const bag = [...Array(15).keys()].sort(() => Math.random() - 0.5);
        bag.forEach((tIndex, k) => {
            const pId = this.players[k % count].id;
            this.board[tIndex] = { player: pId, troops: 2, assets: [] };
        });
        this.currentIndex = 0;
        this.phase = "spin";
        emit("gameDidReset", this.snapshot());
        return this;
    }
    current() { return this.players[this.currentIndex]; }
    canCurrentPlayerAct() {
        const current = this.current();
        // Legacy demo records have no Firebase IDs, so retain their original
        // local behaviour. New rooms always contain an owner UID.
        return !this.localUid || !current?.uid || current.uid === this.localUid;
    }
    player(id) { return this.players.find((p) => p.id === id); }
    livingPlayers() { return this.players.filter((p) => p.alive); }
    territoriesOf(id) {
        return this.board.map((t, i) => ({ ...t, index: i })).filter((t) => t.player === id);
    }

    score(p) {
        let s = this.territoriesOf(p.id).length * 3;
        s += (p.steelFarm || 0) * BUILDABLES.steelFarm.points;
        s += (p.potatoFarm || 0) * BUILDABLES.potatoFarm.points;
        s += (p.titaniumFarm || 0) * BUILDABLES.titaniumFarm.points;
        s += (p.uraniumMine || 0) * BUILDABLES.uraniumMine.points;
        s += (p.city || 0) * BUILDABLES.city.points;
        return s + Math.floor(p.troops / 3);
    }

    leader() { return this.livingPlayers().slice().sort((a, b) => this.score(b) - this.score(a))[0]; }

    canAfford(p, key) {
        const cost = BUILDABLES[key].cost;
        return Object.entries(cost).every(([r, v]) => p[r] >= v);
    }

    spin() {
        if (!this.canCurrentPlayerAct()) return null;
        if (this.phase !== "spin" || this.spinsRemaining <= 0) return null;
        const p = this.current();
        const total = p.wheel.reduce((a, s) => a + s.size, 0);
        let roll = Math.random() * total;
        let index = 0;
        for (let i = 0; i < p.wheel.length; i++) {
            roll -= p.wheel[i].size;
            if (roll <= 0) { index = i; break; }
        }
        const slice = p.wheel[index];
        const def = SLICE_TYPES[slice.type];
        const result = { playerId: p.id, sliceIndex: index, slice: { ...slice }, type: slice.type, label: def.label, messages: [] };
        switch (def.kind) {
            case "resource":
                p[def.resource] += def.amount;
                result.messages.push(`+${def.amount} ${def.resource}`);
                break;
            case "jackpot":
                ["steel", "potato", "titanium"].forEach((r) => (p[r] += 4));
                p.uranium += 1;
                p.troops += 2;
                result.messages.push("JACKPOT! +4 steel/potato/titanium, +1 uranium, +2 troops");
                break;
            case "troop":
                p.troops += def.amount;
                result.messages.push(`+${def.amount} troops`);
                break;
            case "respin":
                this.spinsRemaining += 1;
                result.messages.push("Re-spin! Spin again.");
                break;
            case "neutral":
                result.messages.push("Nothing happens.");
                break;
            case "disaster": {
                const owned = this.territoriesOf(p.id).filter((t) => t.troops > 0 || t.assets.length);
                if (owned.length) {
                    const t = owned[Math.floor(Math.random() * owned.length)];
                    if (t.assets.length && Math.random() < 0.5) {
                        const lost = t.assets.pop();
                        p[lost] = Math.max(0, (p[lost] || 0) - 1); // Decrement flat structure count
                        result.messages.push(`Disaster! ${BUILDABLES[lost].label} destroyed.`);
                    } else {
                        const lost = Math.min(t.troops, 2);
                        this.board[t.index].troops -= lost;
                        result.messages.push(`Disaster! ${lost} troops lost.`);
                    }
                } else {
                    result.messages.push("Disaster, but nothing to lose.");
                }
                break;
            }
            case "blight": {
                const lost = Math.min(p.potato, 3);
                p.potato -= lost;
                result.messages.push(`Blight! -${lost} potato.`);
                break;
            }
        }

        this.spinsRemaining -= 1;
        this.lastSpin = result;
        if (this.spinsRemaining <= 0) {
            this.phase = "build";
            this.buildsRemaining = 2;
        }
        this.addLog(`${p.nation} spun ${def.label}. ${result.messages.join(" ")}`);
        emit("playerDidSpin", { ...result, state: this.snapshot() });
        return result;
    }

    build(territoryIndex, key) {
        if (!this.canCurrentPlayerAct()) return { ok: false, error: "It is not your turn." };
        const p = this.current();
        const t = this.board[territoryIndex];

        if (this.phase !== "build" || this.buildsRemaining <= 0) return { ok: false, error: "Not in build phase." };
        if (!t || t.player !== p.id) return { ok: false, error: "You must build on your own territory." };
        if (!BUILDABLES[key]) return { ok: false, error: "Unknown structure." };
        if (!this.canAfford(p, key)) return { ok: false, error: "Not enough resources." };
        if (key !== "troops" && t.assets.length >= 3) return { ok: false, error: "Territory is full (3 structures)." };

        // Deduct flat resources
        Object.entries(BUILDABLES[key].cost).forEach(([r, v]) => (p[r] -= v));

        if (key === "troops") {
            t.troops += BUILDABLES.troops.troops;
        } else {
            t.assets.push(key);
            p[key] = (p[key] || 0) + 1; // Increase flat structure count on player JSON!
        }

        p.structuresSinceDraft += 1;
        this.buildsRemaining -= 1;
        this.addLog(`${p.nation} built ${BUILDABLES[key].label}.`);
        // Enter draft before notifying Firebase listeners. Otherwise the
        // build event saves the previous phase and immediately closes the UI.
        if (p.structuresSinceDraft >= 3) this.openDraft();
        emit("playerDidBuild", { playerId: p.id, territoryIndex, buildable: key, state: this.snapshot() });
        return { ok: true };
    }

    attack(fromIndex, toIndex) {
        if (!this.canCurrentPlayerAct()) return { ok: false, error: "It is not your turn." };
        const p = this.current();
        const from = this.board[fromIndex];
        const to = this.board[toIndex];

        if (!from || !from.player || !to) return { ok: false, error: "Bad territories." };
        if (from.player !== p.id) return { ok: false, error: "Attack from your own land." };
        if (to.player === p.id) return { ok: false, error: "That land is already yours." };
        if (!neighborsOf(fromIndex).includes(toIndex)) return { ok: false, error: "Territories are not adjacent." };
        if (from.troops < 2) return { ok: false, error: "Need at least 2 troops to attack." };

        const toTroops = to.troops || 0;
        const toAssets = to.assets || [];
        const atk = Math.floor(Math.random() * 6) + 1 + Math.floor(from.troops / 2);
        const def = Math.floor(Math.random() * 6) + 1 + toTroops + toAssets.filter((a) => a === "city").length * 2;
        const detail = { playerId: p.id, fromIndex, toIndex, atk, def, captured: false };

        if (atk > def) {
            const moving = Math.max(1, Math.floor(from.troops / 2));
            const loserId = to.player;

            // Re-assign territory in the board JSON array
            this.board[toIndex] = {
                player: p.id,
                troops: moving,
                assets: toAssets
            };
            from.troops -= moving;
            detail.captured = true;
            this.addLog(`${p.nation} captured territory (${atk} vs ${def}).`);

            // Check elimination
            if (loserId && !this.territoriesOf(loserId).length) {
                const dead = this.player(loserId);
                dead.alive = false;
                this.addLog(`${dead.nation} has been eliminated!`);
                emit("playerWasEliminated", { playerId: loserId, state: this.snapshot() });
            }
        } else {
            from.troops = Math.max(1, from.troops - 2);
            to.troops = Math.max(0, toTroops - 1);
            this.addLog(`${p.nation}'s assault failed (${atk} vs ${def}).`);
        }

        emit("playerDidAttack", { ...detail, state: this.snapshot() });
        this.checkVictory();
        return { ok: true, ...detail };
    }

    openDraft(hand) {
        const { drawDraftHand } = window.NationsCards || {};
        this.draftHand = hand || (drawDraftHand ? drawDraftHand(3) : []);
        this.phase = "draft";
        emit("draftDidOpen", { playerId: this.current().id, hand: this.draftHand.map((c) => c.id) });
    }

    draft(cardId) {
        if (!this.canCurrentPlayerAct()) return { ok: false, error: "It is not your turn." };
        if (this.phase !== "draft") return { ok: false };
        const card = this.draftHand.find((c) => c.id === cardId);
        if (!card) return { ok: false };
        const p = this.current();
        const msg = card.apply(p, this);
        p.structuresSinceDraft = 0;
        this.draftHand = [];
        this.phase = this.buildsRemaining > 0 ? "build" : "endTurn";
        this.addLog(`${p.nation} drafted ${card.name}. ${msg}`);
        emit("playerDidDraft", { playerId: p.id, cardId, message: msg, state: this.snapshot() });
        return { ok: true, message: msg };
    }

    endTurn() {
        if (!this.canCurrentPlayerAct()) return { ok: false, error: "It is not your turn." };
        if (this.phase === "draft") return { ok: false, error: "Finish your draft first." };
        const p = this.current();
        const gained = {};

        // 1. Calculate yield instantly using the FLAT player json (no map scanning needed)
        Object.keys(BUILDABLES).forEach(key => {
            if (p[key] > 0 && BUILDABLES[key].yield) {
                Object.entries(BUILDABLES[key].yield).forEach(([res, amt]) => {
                    const totalYield = amt * p[key];
                    p[res] += totalYield;
                    gained[res] = (gained[res] || 0) + totalYield;
                });
            }
        });
        emit("playerDidEndTurn", { playerId: p.id, income: gained, state: this.snapshot() });

        // 2. THE NEW WAITING SYSTEM LOGIC
        this.globalState.waiting_on = this.globalState.waiting_on.filter(id => id !== p.id);
        this.globalState.finished_waiting.push(p.id);

        if (this.globalState.waiting_on.length === 0) {
            // Everyone finished! Reset the round.
            this.globalState.round += 1;
            // Only move alive players back into waiting_on
            this.globalState.waiting_on = this.globalState.finished_waiting.filter(id => this.player(id).alive);
            this.globalState.finished_waiting = [];
            this.addLog(`--- Round ${this.globalState.round} begins! ---`);
        }

        // 3. Set the UI up for whoever is next in the waiting list
        const nextPlayerId = this.globalState.waiting_on[0];
        if (nextPlayerId) {
            this.currentIndex = this.players.findIndex(x => x.id === nextPlayerId);
        }

        // Reset local turn variables
        this.phase = "spin";
        this.spinsRemaining = 1;
        this.buildsRemaining = 0;
        this.lastSpin = null;
        this.attackMode = false;
        this.selectedTerritory = null;

        emit("turnDidChange", { playerId: this.current().id, round: this.globalState.round, state: this.snapshot() });
        this.checkVictory();
        return { ok: true };
    }

    checkVictory() {
        const alive = this.livingPlayers();
        if (alive.length === 1 && this.players.length > 1) {
            this.phase = "over";
            this.addLog(`${alive[0].nation} rules the world!`);
            emit("gameDidEnd", { winnerId: alive[0].id, state: this.snapshot() });
            return alive[0];
        }
        return null;
    }

    addLog(text) {
        this.log.unshift({ round: this.globalState.round, text });
        this.log = this.log.slice(0, 60);
    }

    snapshot() {
        return JSON.parse(JSON.stringify({
            currentIndex: this.currentIndex,
            phase: this.phase,
            buildsRemaining: this.buildsRemaining,
            spinsRemaining: this.spinsRemaining,
            players: this.players,
            board: this.board,
            globalState: this.globalState,
            log: this.log,
        }));
    }

    applyState(state) {
        if (!state) return;
        // Older Firebase demo records did not include these arrays. Normalize
        // them here so saved games from either JSON format remain playable.
        const board = state.board
            ? state.board.map((territory) => ({ assets: [], troops: 0, ...territory, assets: territory.assets || [] }))
            : this.board;
        const globalState = state.globalState
            ? { round: 1, waiting_on: [], finished_waiting: [], ...state.globalState, finished_waiting: state.globalState.finished_waiting || [] }
            : this.globalState;
        Object.assign(this, {
            currentIndex: state.currentIndex ?? this.currentIndex,
            phase: state.phase ?? this.phase,
            buildsRemaining: state.buildsRemaining ?? this.buildsRemaining,
            spinsRemaining: state.spinsRemaining ?? this.spinsRemaining,
            players: state.players ? JSON.parse(JSON.stringify(state.players)) : this.players,
            board: JSON.parse(JSON.stringify(board)),
            globalState: JSON.parse(JSON.stringify(globalState)),
            log: state.log ? [...state.log] : this.log,
        });
        emit("gameStateWasApplied", this.snapshot());
    }
}
