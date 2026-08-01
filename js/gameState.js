import {PLAYER_COLORS, NATION_NAMES, BUILDABLES, SLICE_TYPES,TERRITORY_NAMES, makeStartingWheel, neighborsOf} from "./config.js";
export function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

const clampPlayers = (n) => Math.max(2, Math.min(6,n|0));
export class GameState {
    constructor(playerCount=4) {this.reset(playerCount);}
    reset(playerCount = this.playerCount || 4) {
        this.playerCount=clampPlayers(playerCount);
        this.turn=1;
        this.currentIndex= 0;
        this.phase="spin";
        this.buildsRemaining=0;
        this.spinsRemaining =1;
        this.lastSpin = null;
        this.attackMode = false;
        this.selectedTerritory = null;
        this.draftHand = [];
        this.log=[];
        this.players = Array.from({ length: this.playerCount }, (_, i) => ({
            id:`p${i}`,
            index: i,
            name: PLAYER_COLORS[i].name,
            nation: NATION_NAMES[i],
            color: PLAYER_COLORS[i].color,
            alive: true,
            structuresSinceDraft: 0,
            resources: {steel: 4, potato: 4, titanium: 1, uranium: 0, troops: 6},
            wheel: makeStartingWheel(),
        }));
        this.territories = TERRITORY_NAMES.map((name, i) => ({
            id: `t${i}`,
            index: i,
            name,
            owner: null,
            troops: 0,
            assets: [],
        }));
        const bag = this.territories.map((t) => t.index).sort(() => Math.random() - 0.5);
        bag.forEach((tIndex, k) => {
            const p = this.players[k % this.playerCount];
            const t = this.territories[tIndex];
            t.owner = p.id;
            t.troops = 2;
        });
        emit("gameDidReset", this.snapshot());
        return this;
    }
    current() {return this.players[this.currentIndex];}
    player(id) {return this.players.find((p)=>p.id === id);}
    livingPlayers() {return this.players.filter((p) => p.alive);}
    territoriesOf(id) {return this.territories.filter((t)=>t.owner===id);}

    score(p){
        let s = this.territoriesOf(p.id).length*3;
        this.territoriesOf(p.id).forEach((t)=>t.assets.forEach((a)=>(s +=BUILDABLES[a].points)));
        return s + Math.floor(p.resources.troops / 3);
    }
    leader() {return this.livingPlayers().slice().sort((a, b) => this.score(b) - this.score(a))[0];}

    canAfford(p, key) {
        const cost = BUILDABLES[key].cost;
        return Object.entries(cost).every(([r, v])=>p.resources[r] >= v);
    }
    spin() {
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
                p.resources[def.resource] += def.amount;
                result.messages.push(`+${def.amount} ${def.resource}`);
                break;
            case "jackpot":
                ["steel", "potato", "titanium"].forEach((r) => (p.resources[r] += 4));
                p.resources.uranium += 1;
                p.resources.troops += 2;
                result.messages.push("JACKPOT! +4 steel/potato/titanium, +1 uranium, +2 troops");
                break;
            case "troop":
                p.resources.troops += def.amount;
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
                        result.messages.push(`Disaster! ${BUILDABLES[lost].label} destroyed in ${t.name}.`);
                    } else {
                        const lost = Math.min(t.troops, 2);
                        t.troops -= lost;
                        result.messages.push(`Disaster! ${lost} troops lost in ${t.name}.`);
                    }
                } else {
                    result.messages.push("Disaster, but nothing to lose.");
                }
                break;
            }
            case "blight": {
                const lost = Math.min(p.resources.potato, 3);
                p.resources.potato -= lost;
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
    build(territoryId, key) {
        const p = this.current();
        const t = this.territories.find((x) => x.id === territoryId);
        if (this.phase !== "build" || this.buildsRemaining <= 0) return { ok: false, error: "Not in build phase." };
        if (!t || t.owner !== p.id) return { ok: false, error: "You must build on your own territory." };
        if (!BUILDABLES[key]) return { ok: false, error: "Unknown structure." };
        if (!this.canAfford(p, key)) return { ok: false, error: "Not enough resources." };
        if (key !== "troops" && t.assets.length >= 3) return { ok: false, error: "Territory is full (3 structures)." };

        Object.entries(BUILDABLES[key].cost).forEach(([r, v]) => (p.resources[r] -= v));
        if (key === "troops") {
            t.troops += BUILDABLES.troops.troops;
        } else {
            t.assets.push(key);
        }
        p.structuresSinceDraft += 1;
        this.buildsRemaining -= 1;
        this.addLog(`${p.nation} built ${BUILDABLES[key].label} in ${t.name}.`);
        emit("playerDidBuild", { playerId: p.id, territoryId, buildable: key, state: this.snapshot() });

        if (p.structuresSinceDraft >= 3) this.openDraft();
        return { ok: true };
    }
    attack(fromId, toId) {
        const p = this.current();
        const from = this.territories.find((t) => t.id === fromId);
        const to = this.territories.find((t) => t.id === toId);
        if (!from || !to) return { ok: false, error: "Bad territories." };
        if (from.owner !== p.id) return { ok: false, error: "Attack from your own land." };
        if (to.owner === p.id) return { ok: false, error: "That land is already yours." };
        if (!neighborsOf(from.index).includes(to.index)) return { ok: false, error: "Territories are not adjacent." };
        if (from.troops < 2) return { ok: false, error: "Need at least 2 troops to attack." };

        const atk = Math.floor(Math.random() * 6) + 1 + Math.floor(from.troops / 2);
        const def = Math.floor(Math.random() * 6) + 1 + to.troops + to.assets.filter((a) => a === "city").length * 2;
        const detail = { playerId: p.id, fromId, toId, atk, def, captured: false };

        if (atk > def) {
            const moving = Math.max(1, Math.floor(from.troops / 2));
            const loser = to.owner;
            to.owner = p.id;
            to.troops = moving;
            from.troops -= moving;
            detail.captured = true;
            this.addLog(`${p.nation} captured ${to.name} (${atk} vs ${def}).`);
            if (loser && !this.territoriesOf(loser).length) {
                const dead = this.player(loser);
                dead.alive = false;
                this.addLog(`${dead.nation} has been eliminated!`);
                emit("playerWasEliminated", { playerId: loser, state: this.snapshot() });
            }
        } else {
            from.troops = Math.max(1, from.troops - 2);
            to.troops = Math.max(0, to.troops - 1);
            this.addLog(`${p.nation}'s assault on ${to.name} failed (${atk} vs ${def}).`);
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
        if (this.phase === "draft") return { ok: false, error: "Finish your draft first." };
        const p = this.current();
        const gained = {};
        this.territoriesOf(p.id).forEach((t) =>
            t.assets.forEach((a) => {
                const y = BUILDABLES[a].yield;
                if (y) Object.entries(y).forEach(([r, v]) => {
                    p.resources[r] += v;
                    gained[r] = (gained[r] || 0) + v;
                });
            })
        );
        emit("playerDidEndTurn", { playerId: p.id, income: gained, state: this.snapshot() });
        let guard = 0;
        do {
            this.currentIndex = (this.currentIndex + 1) % this.players.length;
            guard++;
            if (this.currentIndex === 0) this.turn += 1;
        } while (!this.current().alive && guard < 20);
        this.phase = "spin";
        this.spinsRemaining = 1;
        this.buildsRemaining = 0;
        this.lastSpin = null;
        this.attackMode = false;
        this.selectedTerritory = null;
        emit("turnDidChange", {playerId: this.current().id, turn: this.turn, state: this.snapshot() });
        this.checkVictory();
        return { ok: true };
    }

    checkVictory() {
        const alive = this.livingPlayers();
        if (alive.length===1 && this.players.length > 1) {
            this.phase="over";
            this.addLog(`${alive[0].nation} rules the world!`);
            emit("gameDidEnd",{ winnerId: alive[0].id,state: this.snapshot() });
            return alive[0];
        }
        return null;
    }

    addLog(text) {
        this.log.unshift({ turn: this.turn, text });
        this.log = this.log.slice(0, 60);
    }
    snapshot() {
        return JSON.parse(JSON.stringify({
            turn: this.turn,
            currentIndex: this.currentIndex,
            phase: this.phase,
            buildsRemaining: this.buildsRemaining,
            spinsRemaining: this.spinsRemaining,
            playerCount:this.playerCount,
            players:this.players,
            territories:this.territories,
            log:this.log,
        }));
    }
    applyState(state) {
        if (!state) return;
        Object.assign(this, {
            turn: state.turn ?? this.turn,
            currentIndex: state.currentIndex??this.currentIndex,
            phase: state.phase??this.phase,
            buildsRemaining: state.buildsRemaining??this.buildsRemaining,
            spinsRemaining: state.spinsRemaining?? this.spinsRemaining,
            playerCount: state.playerCount ??this.playerCount,
            players: state.players ? JSON.parse(JSON.stringify(state.players)) : this.players,
            territories: state.territories ? JSON.parse(JSON.stringify(state.territories)) : this.territories,
            log: state.log?[...state.log]: this.log,
        });
        emit("gameStateWasApplied", this.snapshot());
    }
}
