(() => {
    "use strict";

    const storageKey = "mma-game-data-v1";
    const themeKey = "mma-theme";
    const activeGames = new Map();
    const gameId = document.body.dataset.gameId;

    function readData() {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return { games: {} };

        const data = JSON.parse(raw);
        if (!data || typeof data !== "object" || !data.games || typeof data.games !== "object") {
            throw new TypeError("El formato de los datos locales de juegos no es válido.");
        }
        return data;
    }

    function updateGame(id, update) {
        try {
            const data = readData();
            const current = data.games[id] || {
                sessions: 0,
                completed: 0,
                interactions: 0,
                actions: {},
                totals: {},
                best: {},
                history: [],
                scoreHistory: []
            };
            update(current);
            data.games[id] = current;
            localStorage.setItem(storageKey, JSON.stringify(data));
            renderSummary(id, current);
            return current;
        } catch (error) {
            console.error(`No se pudieron guardar los datos locales de ${id}:`, error);
            return null;
        }
    }

    function renderSummary(id, current) {
        const game = current || get(id);
        if (!game) return;
        const labels = {
            blueGoals: "Goles azul",
            aiScore: "IA",
            kills: "Bajas",
            playerScore: "Puntos",
            redGoals: "Goles rojo",
            wave: "Oleada",
            wins: "Victorias"
        };
        document.querySelectorAll(`[data-game-summary="${id}"]`).forEach((element) => {
            const best = Object.entries(game.best || {})
                .map(([key, value]) => `${labels[key] || key}: ${value}`)
                .join(" · ");
            element.textContent = `Récord local${best ? ` — ${best}` : ""} · Partidas: ${game.sessions || 0} · Interacciones: ${game.interactions || 0}`;
        });
        document.querySelectorAll(`[data-score-history="${id}"]`).forEach((element) => {
            const entries = (game.scoreHistory || []).slice(-3).reverse();
            element.replaceChildren();
            if (entries.length === 0) {
                const item = document.createElement("li");
                item.textContent = "Aún no hay partidas guardadas.";
                element.appendChild(item);
                return;
            }
            entries.forEach((entry) => {
                const item = document.createElement("li");
                const result = entry.result;
                let score = "";
                if (typeof result.blueGoals === "number" && typeof result.redGoals === "number") {
                    score = `Azul ${result.blueGoals} – ${result.redGoals} Rojo`;
                } else if (typeof result.playerScore === "number") {
                    score = `Jugador ${result.playerScore}${typeof result.aiScore === "number" ? ` – IA ${result.aiScore}` : ""}`;
                } else {
                    score = [
                        typeof result.wave === "number" ? `Oleada ${result.wave}` : "",
                        typeof result.kills === "number" ? `${result.kills} bajas` : ""
                    ].filter(Boolean).join(" · ");
                }
                const date = new Date(entry.at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
                item.textContent = `${score} · ${date}`;
                element.appendChild(item);
            });
        });
    }

    function saveScoreHistory(game, result, keepZeroScore = false) {
        const score = Object.fromEntries(
            Object.entries(result).filter(([, value]) => typeof value === "number" && Number.isFinite(value))
        );
        if (!keepZeroScore && Object.values(score).every((value) => value === 0)) return;

        const history = game.scoreHistory || (game.scoreHistory = []);
        const previous = history[history.length - 1];
        if (previous) {
            const previousScore = Object.fromEntries(
                Object.entries(previous.result).filter(([key, value]) => key !== "wins" && typeof value === "number")
            );
            const currentScore = Object.fromEntries(
                Object.entries(score).filter(([key]) => key !== "wins")
            );
            if (JSON.stringify(previousScore) === JSON.stringify(currentScore)) return;
        }
        history.push({ at: new Date().toISOString(), result: score });
        if (history.length > 20) history.shift();
    }

    function get(id) {
        try {
            return readData().games[id] || null;
        } catch (error) {
            console.error(`No se pudieron leer los datos locales de ${id}:`, error);
            return null;
        }
    }

    function track(id, action) {
        updateGame(id, (game) => {
            game.interactions += 1;
            game.actions[action] = (game.actions[action] || 0) + 1;
            game.history.push({ at: new Date().toISOString(), action });
            if (game.history.length > 100) game.history.shift();
        });
    }

    function begin(id) {
        if (activeGames.has(id)) finish(id);
        updateGame(id, (game) => {
            game.sessions += 1;
            game.lastPlayed = new Date().toISOString();
        });
        activeGames.set(id, Date.now());
        track(id, "partida_iniciada");
    }

    function finish(id, result) {
        const startedAt = activeGames.get(id);
        if (startedAt === undefined) return;
        activeGames.delete(id);

        updateGame(id, (game) => {
            game.durationSeconds = (game.durationSeconds || 0) + Math.round((Date.now() - startedAt) / 1000);
            if (!result) return;
            game.completed += 1;
            game.lastResult = result;
            saveScoreHistory(game, result, true);
            Object.entries(result).forEach(([key, value]) => {
                if (typeof value !== "number" || !Number.isFinite(value)) return;
                game.totals[key] = (game.totals[key] || 0) + value;
                game.best[key] = Math.max(game.best[key] || 0, value);
            });
        });
    }

    function saveScore(id, result) {
        updateGame(id, (game) => {
            game.lastResult = result;
            saveScoreHistory(game, result);
            Object.entries(result).forEach(([key, value]) => {
                if (typeof value !== "number" || !Number.isFinite(value)) return;
                game.best[key] = Math.max(game.best[key] || 0, value);
            });
        });
    }

    window.GameStorage = { begin, finish, get, saveScore, track };
    window.addEventListener("pagehide", () => {
        activeGames.forEach((startedAt, id) => finish(id));
    });

    if (gameId) renderSummary(gameId);

    let savedTheme = "dark";
    try {
        savedTheme = localStorage.getItem(themeKey) || "dark";
    } catch (error) {
        console.error("No se pudo leer la preferencia de color:", error);
    }
    const applyTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        document.body.dataset.theme = theme;
        const scene = document.querySelector("a-scene");
        if (scene) {
            scene.setAttribute("background", {
                color: theme === "light" ? "#eef3f8" : "#0b0e14"
            });
        }
        const button = document.getElementById("theme-toggle");
        if (button) {
            const light = theme === "light";
            button.textContent = light ? "🌙 Modo oscuro" : "☀️ Modo claro";
            button.setAttribute("aria-label", light ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
            button.setAttribute("aria-pressed", String(light));
        }
    };

    applyTheme(savedTheme === "light" ? "light" : "dark");

    function createThemeButton(floating = false) {
        const button = document.createElement("button");
        button.id = "theme-toggle";
        button.className = floating ? "theme-toggle theme-toggle--floating" : "theme-toggle btn btn-sm ms-2";
        button.type = "button";
        button.addEventListener("click", () => {
            const theme = document.body.dataset.theme === "light" ? "dark" : "light";
            try {
                localStorage.setItem(themeKey, theme);
            } catch (error) {
                console.error("No se pudo guardar la preferencia de color:", error);
            }
            applyTheme(theme);
            if (gameId) track(gameId, "cambio_de_tema");
        });
        return button;
    }

    const navbar = document.querySelector(".navbar");
    if (navbar) {
        navbar.querySelector(".container, .container-fluid").appendChild(createThemeButton());
        applyTheme(document.body.dataset.theme);
    } else {
        document.body.appendChild(createThemeButton(true));
        applyTheme(document.body.dataset.theme);
    }
})();
