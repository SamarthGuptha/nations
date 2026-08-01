import {GameState,emit} from "./gameState.js";
import {UIController} from "./ui.js";
import * as Cards from "./cards.js";
import * as Config from "./config.js";
window.NationsCards = Cards;
const game = new GameState(4);
const ui = new UIController(game);
ui.render();

window.Nations = {
    game,
    ui,
    config: Config,
    cards: Cards,
    applyGameState: (state) => {
        game.applyState(state);
        ui.render();
    },
    getGameState: () => game.snapshot(),
    remote: {
        spin: () => ui.doSpin(),
        build: (territoryId, buildable) => {
            const r = game.build(territoryId, buildable);
            ui.render();
            return r;
        },
        attack: (fromId, toId) => {
            const r = game.attack(fromId, toId);
            ui.render();
            return r;
        },
        draft: (cardId) => {
            const r = game.draft(cardId);
            ui.render();
            return r;
        },
        endTurn: () => {
            const r = game.endTurn();
            ui.render();
            return r;
        },
        newGame: (count) => {
            game.reset(count);
            ui.render();
        },
    },
    emit,
};

window.applyGameState = window.Nations.applyGameState;
window.getGameState = window.Nations.getGameState;
["playerDidSpin", "playerDidBuild", "playerDidAttack", "playerDidDraft", "playerDidEndTurn", "turnDidChange", "gameDidEnd", "gameDidReset"]
    .forEach((evt) => document.addEventListener(evt, () => {
        if (!ui.busy) ui.render();
    }));
