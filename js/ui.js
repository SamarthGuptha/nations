import {BUILDABLES,RESOURCES,SLICE_TYPES,neighborsOf} from "./config.js";
import {WheelRenderer} from "./wheel.js"

export class UIController {
    constructor(game) {
        this.game = game;
        this.selectedBuild = null;
        this.busy = false;
        this.el = {
            playerList: document.getElementById("playerList"),
            log:document.getElementById("log"),
            map:document.getElementById("map"),
            turnBanner:document.getElementById("turnBanner"),
            mapHint: document.getElementById("mapHint"),
            spinBtn: document.getElementById("spinBtn"),
            spinResult: document.getElementById("spinResult"),
            buildMenu: document.getElementById("buildMenu"),
            buildsLeft:document.getElementById("buildsLeft"),
            attackBtn:document.getElementById("attackBtn"),
            endTurnBtn:document.getElementById("endTurnBtn"),
            draftBackdrop:document.getElementById("draftBackdrop"),
            draftCards:document.getElementById("draftCards"),
            draftSub:document.getElementById("draftSub"),
            pcValue:document.getElementById("pcValue"),
        };
        this.wheel = new WheelRenderer(document.getElementById("wheel"));
        this.bind();
    }
    bind() {
        this.el.spinBtn.addEventListener("click", () => this.doSpin());
        this.el.endTurnBtn.addEventListener("click", () => {
            const r =this.game.endTurn();
            if (!r.ok) this.flash(r.error);
            this.selectedBuild = null;
            this.render();
        });
        this.el.attackBtn.addEventListener("click", () => {
            this.game.attackMode=!this.game.attackMode;
            this.selectedBuild= null;
            this.game.selectedTerritory = null;
            this.render();
        });
        this.el.map.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-territory]");
            if (btn) this.onTerritory(btn.dataset.territory);
        });
        this.el.buildMenu.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-build]");
            if (!btn || btn.disabled) return;
            this.selectedBuild = this.selectedBuild === btn.dataset.build ? null : btn.dataset.build;
            this.game.attackMode = false;
            this.render();
        });
        document.getElementById("pcPlus").addEventListener("click", () => this.changeCount(1));
        document.getElementById("pcMinus").addEventListener("click", () => this.changeCount(-1));
        document.getElementById("newGame").addEventListener("click", () => {
            this.game.reset(Number(this.el.pcValue.textContent));
            this.render();
        });

        document.addEventListener("draftDidOpen", () => this.renderDraft());
        document.addEventListener("gameStateWasApplied", () => this.render());
    }
    changeCount(delta) {
        const next = Math.max(2, Math.min(6, Number(this.el.pcValue.textContent) + delta));
        this.el.pcValue.textContent = String(next);
    }
    doSpin() {
        if (this.busy || this.game.phase !== "spin") return;
        const result = this.game.spin();
        if (!result) return;
        this.busy = true;
        this.el.spinBtn.disabled = true;
        this.wheel.spinTo(result.sliceIndex, () => {
            this.busy = false;
            this.el.spinResult.textContent = `${SLICE_TYPES[result.type].label} — ${result.messages.join(" ")}`;
            this.render();
        });
    }
    onTerritory(id) {
        const game = this.game;
        if (game.phase === "over") return;
        if (game.attackMode) {
            const t = game.territories.find((x) => x.id === id);
            if (!game.selectedTerritory) {
                if (t.owner !== game.current().id) return this.flash("Pick one of your own territories first.");
                game.selectedTerritory = id;
                return this.render();
            }
            if (game.selectedTerritory === id) {
                game.selectedTerritory = null;
                return this.render();
            }
            const r = game.attack(game.selectedTerritory, id);
            if (!r.ok) this.flash(r.error);
            else this.flash(r.captured ? `Captured ${t.name}! (${r.atk} vs ${r.def})` : `Assault repelled (${r.atk} vs ${r.def})`);
            game.selectedTerritory = null;
            game.attackMode = false;
            return this.render();
        }
        if (!this.selectedBuild) return this.flash("Choose something to build first.");
        const r = game.build(id, this.selectedBuild);
        if (!r.ok) this.flash(r.error);
        if (r.ok) this.selectedBuild = null;
        this.render();
    }

    flash(msg) {
        if (!msg) return;
        this.pendingFlash = msg;
        this.el.mapHint.textContent = msg;
    }
    render() {
        const game = this.game;
        const p = game.current();
        this.renderPlayers();
        this.renderMap();
        this.renderLog();
        this.wheel.render(p.wheel);
        this.el.turnBanner.textContent =
            game.phase === "over" ? `${game.leader().nation} wins!` : `Turn ${game.turn} — ${p.nation}`;

        if (game.phase !== "over") {
            const base = {
                spin: "Spin your wheel to gather resources.",
                build: this.game.attackMode
                    ? "Attack mode: pick your territory, then an adjacent enemy."
                    : this.selectedBuild
                        ? `Click one of your territories to place a ${BUILDABLES[this.selectedBuild].label}.`
                        : `${game.buildsRemaining} build(s) left, choose a structure, attack, or end your turn.`,
                draft: "Choose a draft card.",
                endTurn: "End your turn when ready.",
            }[game.phase];
            this.el.mapHint.textContent = this.pendingFlash || base || "";
            this.pendingFlash = null;
        }

        this.el.spinBtn.disabled = this.busy || game.phase !== "spin";
        this.el.attackBtn.disabled = game.phase === "spin" || game.phase === "draft" || game.phase === "over";
        this.el.attackBtn.classList.toggle("is-on", game.attackMode);
        this.el.endTurnBtn.disabled = game.phase === "spin" || game.phase === "draft" || game.phase === "over";
        this.el.buildsLeft.textContent = `${game.buildsRemaining} left`;
        if (game.phase === "spin") this.el.spinResult.innerHTML = "&nbsp;";

        this.renderBuildMenu();
        if (game.phase !== "draft") this.el.draftBackdrop.hidden = true;
    }
    renderPlayers() {
        const game = this.game;
        this.el.playerList.innerHTML = game.players
            .map((p) => {
                const active = p.index === game.currentIndex && game.phase !== "over";
                const res = active
                    ? `<div class="res-row">${Object.entries(RESOURCES)
                        .map(([k, r]) => `<span class="res">${r.icon} ${p.resources[k]}</span>`)
                        .join("")}</div>`
                    :"";
                return `<div class="player-card ${active ? "active" : ""} ${p.alive ? "" : "dead"}">
            <span class="swatch" style="background:${p.color}"></span>
            <span>
              <span class="pname">${p.nation}</span>
              <span class="pmeta">${p.name} · ${game.territoriesOf(p.id).length} lands${active ? " · YOUR TURN" : ""}</span>
              ${res}
            </span>
            <span class="pscore">${game.score(p)}</span>
          </div>`;
            })
            .join("");
    }

    renderMap() {
        const game = this.game;
        const cur = game.current();
        const selected = game.selectedTerritory;
        const targets = selected ? neighborsOf(game.territories.find((t) => t.id === selected).index) : [];
        this.el.map.innerHTML = game.territories
            .map((t) => {
                const owner = t.owner ? game.player(t.owner) : null;
                const bg = owner ? owner.color : "#a89b78";
                const isTarget = game.attackMode && selected && targets.includes(t.index) && t.owner !== cur.id;
                return `<button class="terr ${selected === t.id ? "selected" : ""} ${isTarget ? "targetable" : ""}"
            data-territory="${t.id}" style="--terr-bg:${bg}; color:${isLight(bg) ? "#26190f" : "#f6e6bf"}">
            <span class="tname">${t.name}</span>
            <span class="towner">${owner ? owner.nation : "Unclaimed"}</span>
            <span class="ttroops">⚔ ${t.troops}</span>
            <span class="tassets">${t.assets.map((a) => BUILDABLES[a].icon).join(" ")}</span>
          </button>`;
            })
            .join("");
    }

    renderBuildMenu() {
        const game = this.game;
        const p = game.current();
        const disabledAll = game.phase !== "build" || game.buildsRemaining <= 0;
        this.el.buildMenu.innerHTML = Object.entries(BUILDABLES)
            .map(([key, b]) => {
                const afford = game.canAfford(p, key);
                const cost = Object.entries(b.cost).map(([r, v]) => `${v}${RESOURCES[r].icon}`).join(" ");
                return `<button class="build-item ${this.selectedBuild === key ? "selected" : ""}"
            data-build="${key}" ${disabledAll || !afford ? "disabled" : ""}>
            <span>${b.icon}</span><span>${b.label}</span><span class="build-cost">${cost}</span>
          </button>`;
            })
            .join("");
    }

    renderLog() {
        this.el.log.innerHTML = this.game.log
            .map((l) => `<li><b>T${l.turn}</b> ${l.text}</li>`)
            .join("");
    }

    renderDraft() {
        const game = this.game;
        this.el.draftSub.textContent = `${game.current().nation} choose one upgrade; it permanently alters the wheel.`;
        this.el.draftCards.innerHTML = game.draftHand
            .map(
                (c) => `<button class="card" data-card="${c.id}">
          <div class="card-icon">${c.icon}</div>
          <h3>${c.name}</h3>
          <p>${c.desc}</p>
          <span class="tag">${c.tag}</span>
        </button>`
            )
            .join("");
        this.el.draftBackdrop.hidden = false;
        this.el.draftCards.onclick = (e) => {
            const btn = e.target.closest("[data-card]");
            if (!btn) return;
            const r = this.game.draft(btn.dataset.card);
            this.el.draftBackdrop.hidden = true;
            if (r.message) this.flash(r.message);
            this.render();
        };
    }
}
const isLight = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 150;
};
