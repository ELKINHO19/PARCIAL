(() => {
    "use strict";

    const roster = [
        { id: "samurai", name: "Samurái", role: "Corte de viento", special: "Tajo Imperial de Fuego", color: "#db554b", accent: "#ffd27a", stats: [82, 77, 68], type: "samurai" },
        { id: "ninja", name: "Ninja", role: "Paso de humo", special: "Shuriken Relámpago", color: "#7657bd", accent: "#c3adff", stats: [91, 72, 83], type: "ninja" },
        { id: "cyborg", name: "Cyborg", role: "Escudo de energía", special: "Cañón de Plasma Omega", color: "#43839a", accent: "#7ce5f4", stats: [66, 93, 78], type: "cyborg" },
        { id: "monk", name: "Monje Shaolin", role: "Salto acrobático", special: "Dragón Ascendente", color: "#d49a37", accent: "#ffe68a", stats: [79, 76, 92], type: "monk" },
        { id: "warlock", name: "Hechicero", role: "Sombra lenta", special: "Meteorito del Abismo", color: "#4b386b", accent: "#d18cff", stats: [73, 88, 74], type: "warlock" },
        { id: "valkyrie", name: "Valquiria", role: "Embestida de luz", special: "Juicio de Valhalla", color: "#499aa1", accent: "#c2fff0", stats: [86, 75, 80], type: "valkyrie" },
        { id: "golem", name: "Gólem", role: "Golpe sísmico", special: "Impacto Tectónico", color: "#77644e", accent: "#e2bf87", stats: [57, 98, 72], type: "golem" },
        { id: "volt", name: "Voltio", role: "Sprint supersónico", special: "Cometa Voltio", color: "#2988a9", accent: "#8be8ff", stats: [99, 65, 81], type: "volt" },
        { id: "knight", name: "Caballero", role: "Bloqueo perfecto", special: "Excalibur Radiante", color: "#b2a276", accent: "#fff1ba", stats: [70, 91, 79], type: "knight" },
        { id: "alchemist", name: "Alquimista", role: "Cortina de humo", special: "Nova Carmesí", color: "#b95062", accent: "#ffc3be", stats: [78, 74, 90], type: "alchemist" }
    ];
    const techniqueColors = {
        samurai: "#ff4b3e",
        ninja: "#8c5cff",
        cyborg: "#00d5ff",
        monk: "#ffbe0b",
        warlock: "#bd00ff",
        valkyrie: "#00f5a0",
        golem: "#a87945",
        volt: "#eaff00",
        knight: "#f5f5f5",
        alchemist: "#ff3d8d"
    };
    const celebrations = ["Formación estelar", "Salto sincronizado", "Baile de campeones", "Saludo al goleador", "Deslizamiento triunfal"];
    const difficultySettings = {
        easy: { reaction: 1.2, accuracy: 0.55, aggression: 0.55 },
        normal: { reaction: 0.8, accuracy: 0.72, aggression: 0.72 },
        hard: { reaction: 0.48, accuracy: 0.85, aggression: 0.88 },
        legend: { reaction: 0.24, accuracy: 0.95, aggression: 1 }
    };

    class SoundManager {
        constructor() {
            this.context = null;
            this.activeTrackType = null;
            this.musicFallback = null;
            this.unlocked = false;
        }

        unlock() {
            if (this.unlocked) return;
            this.unlocked = true;
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.context = new AudioContextClass();
                if (this.context.state === "suspended") this.context.resume();
            }
            this.playTrack("match");
        }

        playTrack(type) {
            if (this.activeTrackType === type) return;
            this.activeTrackType = type;
            if (this.musicFallback) {
                window.clearInterval(this.musicFallback);
                this.musicFallback = null;
            }
            this.startSynthMusic(type);
        }

        startSynthMusic(type) {
            if (!this.context || this.musicFallback) return;
            const notes = type === "select" ? [220, 277, 330, 277, 196, 247, 294, 247] : [330, 392, 494, 392, 294, 370, 440, 370];
            let index = 0;
            this.musicFallback = window.setInterval(() => {
                if (!this.context || this.context.state !== "running") return;
                const oscillator = this.context.createOscillator();
                const gain = this.context.createGain();
                oscillator.type = type === "select" ? "square" : "sawtooth";
                oscillator.frequency.value = notes[index++ % notes.length];
                gain.gain.setValueAtTime(0.0001, this.context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.025, this.context.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.17);
                oscillator.connect(gain).connect(this.context.destination);
                oscillator.start();
                oscillator.stop(this.context.currentTime + 0.18);
            }, type === "select" ? 250 : 200);
        }

        effect(frequency = 440, duration = 0.09, shape = "square") {
            if (!this.context || this.context.state !== "running") return;
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = shape;
            oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.55), this.context.currentTime + duration);
            gain.gain.setValueAtTime(0.12, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
            oscillator.connect(gain).connect(this.context.destination);
            oscillator.start();
            oscillator.stop(this.context.currentTime + duration);
        }

        announce(text, pitch = 1.15) {
            if (!("speechSynthesis" in window) || !this.unlocked) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "es-MX";
            utterance.pitch = pitch;
            utterance.rate = 1.08;
            utterance.volume = 0.75;
            window.speechSynthesis.speak(utterance);
        }

        stop() {
            if (this.musicFallback) window.clearInterval(this.musicFallback);
            this.activeTrackType = null;
            this.musicFallback = null;
        }
    }

    class FootballGame {
        constructor() {
            this.canvas = document.getElementById("football-canvas");
            this.ctx = this.canvas.getContext("2d");
            this.sound = new SoundManager();
            this.state = "menu";
            this.mode = "cpu";
            this.difficulty = "normal";
            this.selectingSide = 0;
            this.selections = [[0, 1, 2, 3], [4, 5, 6, 7]];
            this.trainingCharacterIndex = 0;
            this.score = [0, 0];
            this.matchTime = 90;
            this.half = 1;
            this.halftimeEndAt = 0;
            this.lastFrame = 0;
            this.keys = new Set();
            this.touchDirections = new Set();
            this.players = [];
            this.ball = null;
            this.chargeStartedAt = 0;
            this.chargeAmount = 0;
            this.energy = [100, 100];
            this.specialCooldown = new Map();
            this.storyRound = Number(localStorage.getItem("footballStoryRound") || 0);
            this.storyNames = ["Los Lobos de Bruma", "Circuito Celeste", "Guardianes del Eclipse", "Titán del Norte", "Campeones Dimensionales"];
            this.goalEndAt = 0;
            this.goalStartedAt = 0;
            this.goalTeam = 0;
            this.celebration = 0;
            this.screenWidth = 1000;
            this.screenHeight = 1000;
            this.setupCanvas();
            this.canvasResizeObserver = new ResizeObserver(() => this.setupCanvas());
            this.canvasResizeObserver.observe(this.canvas.parentElement);
            this.setupSelection();
            this.setupEvents();
            this.drawMenuPitch();
            this.frame = this.frame.bind(this);
            requestAnimationFrame(this.frame);
        }

        setupCanvas() {
            const bounds = this.canvas.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(bounds.width * ratio);
            this.canvas.height = Math.round(bounds.height * ratio);
            this.spriteYCompensation = Math.min(1.8, Math.max(1, bounds.width / Math.max(1, bounds.height) * this.screenHeight / this.screenWidth));
            this.ctx.setTransform(this.canvas.width / this.screenWidth, 0, 0, this.canvas.height / this.screenHeight, 0, 0);
        }

        setupSelection() {
            const grid = document.getElementById("character-grid");
            grid.innerHTML = roster.map((character, index) => `
                <button class="character-card" type="button" data-character="${index}" aria-pressed="false">
                    <span class="character-avatar avatar-${index}">${character.name.slice(0, 1)}</span>
                    <strong>${character.name}</strong>
                    <small>${character.role}</small>
                    <span class="character-stats"><span class="stat-${Math.round(Math.max(...character.stats) / 10) * 10}"></span></span>
                </button>`).join("");
            this.updateSelection();
        }

        setupEvents() {
            window.addEventListener("resize", () => this.setupCanvas());
            this.canvas.parentElement.addEventListener("wheel", event => {
                const overlay = event.target.closest(".football-overlay:not([hidden])");
                const scrollable = overlay && event.target.closest("#character-grid, .selection-panel, .football-overlay");
                const canScroll = scrollable
                    && scrollable.scrollHeight > scrollable.clientHeight
                    && (event.deltaY < 0
                        ? scrollable.scrollTop > 0
                        : scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight);
                if (!canScroll) event.preventDefault();
            }, { passive: false });
            document.getElementById("open-match").addEventListener("click", () => this.openSelection("cpu"));
            document.getElementById("open-story").addEventListener("click", () => this.openSelection("story"));
            document.getElementById("open-training").addEventListener("click", () => this.openSelection("training"));
            document.getElementById("back-to-welcome").addEventListener("click", () => this.showScreen("welcome-screen"));
            document.getElementById("character-grid").addEventListener("click", event => {
                const card = event.target.closest("[data-character]");
                if (card) this.toggleCharacter(Number(card.dataset.character));
            });
            document.querySelectorAll(".mode-option").forEach(button => {
                button.addEventListener("click", () => this.setMode(button.dataset.mode));
            });
            document.getElementById("difficulty").addEventListener("change", event => {
                this.difficulty = event.target.value;
            });
            document.getElementById("selection-side").addEventListener("click", () => {
                if (this.mode !== "local") return;
                this.selectingSide = 1 - this.selectingSide;
                this.updateSelection();
            });
            document.getElementById("start-match").addEventListener("click", () => this.startMatch());
            document.getElementById("play-again").addEventListener("click", () => this.openSelection(this.mode));
            document.getElementById("return-menu").addEventListener("click", () => {
                this.sound.stop();
                this.showScreen("welcome-screen");
            });
            window.addEventListener("keydown", event => this.handleKeyDown(event));
            window.addEventListener("keyup", event => this.handleKeyUp(event));
            window.addEventListener("blur", () => {
                this.keys.clear();
                this.touchDirections.clear();
                this.chargeStartedAt = 0;
            });
            document.querySelectorAll("[data-touch-direction]").forEach(button => {
                button.addEventListener("pointerdown", event => {
                    event.preventDefault();
                    button.setPointerCapture(event.pointerId);
                    this.touchDirections.add(button.dataset.touchDirection);
                    button.classList.add("is-pressed");
                });
                const release = event => {
                    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
                    this.touchDirections.delete(button.dataset.touchDirection);
                    button.classList.remove("is-pressed");
                };
                button.addEventListener("pointerup", release);
                button.addEventListener("pointercancel", release);
                button.addEventListener("lostpointercapture", event => {
                    this.touchDirections.delete(button.dataset.touchDirection);
                    button.classList.remove("is-pressed");
                });
            });
            document.querySelectorAll("[data-touch-action]").forEach(button => {
                const action = button.dataset.touchAction;
                button.addEventListener("pointerdown", event => {
                    event.preventDefault();
                    button.setPointerCapture(event.pointerId);
                    button.classList.add("is-pressed");
                    this.activateTouchAction(action);
                });
                const release = event => {
                    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
                    button.classList.remove("is-pressed");
                    this.releaseTouchAction(action);
                };
                button.addEventListener("pointerup", release);
                button.addEventListener("pointercancel", release);
                button.addEventListener("lostpointercapture", () => {
                    button.classList.remove("is-pressed");
                    this.releaseTouchAction(action);
                });
            });
        }

        openSelection(mode) {
            this.sound.unlock();
            this.setMode(mode);
            this.sound.playTrack("select");
            this.showScreen("selection-screen");
        }

        setMode(mode) {
            this.mode = mode;
            document.body.classList.toggle("football-training-mode", mode === "training");
            this.selectingSide = 0;
            document.querySelectorAll(".mode-option").forEach(button => {
                button.classList.toggle("active", button.dataset.mode === mode);
            });
            const local = mode === "local";
            const training = mode === "training";
            document.getElementById("selection-side").hidden = !local;
            document.getElementById("difficulty-control").hidden = local || mode === "story" || training;
            document.getElementById("selection-eyebrow").textContent = training
                ? "CANCHA LIBRE · PRÁCTICA INDIVIDUAL"
                : mode === "story" ? `MODO HISTORIA · JORNADA ${this.storyRound + 1}` : "PREPARA TU ALINEACIÓN";
            document.getElementById("selection-title").innerHTML = training
                ? "Elige un <em>personaje</em>"
                : "Elige a tus <em>4 titulares</em>";
            document.getElementById("selection-tip").textContent = training
                ? "Escoge 1 personaje · prueba sus controles y técnicas en una cancha sin rivales"
                : "El portero se asigna automáticamente · haz clic para elegir";
            const storyIntro = document.getElementById("story-intro");
            const rival = this.storyNames[Math.min(this.storyRound, this.storyNames.length - 1)];
            storyIntro.hidden = mode !== "story";
            storyIntro.textContent = mode === "story"
                ? `${rival}: «La cancha se decide con valor. ¡Demuestra que tu equipo merece llegar a la final!»`
                : "";
            this.updateSelection();
        }

        toggleCharacter(index) {
            if (this.mode === "training") {
                this.trainingCharacterIndex = this.trainingCharacterIndex === index ? null : index;
                this.updateSelection();
                return;
            }
            const selected = this.selections[this.selectingSide];
            const existing = selected.indexOf(index);
            if (existing !== -1) selected.splice(existing, 1);
            else if (selected.length < 4) selected.push(index);
            this.updateSelection();
        }

        updateSelection() {
            const selection = this.mode === "training"
                ? (this.trainingCharacterIndex === null ? [] : [this.trainingCharacterIndex])
                : this.selections[this.selectingSide];
            document.querySelectorAll(".character-card").forEach(card => {
                const chosen = selection.includes(Number(card.dataset.character));
                card.classList.toggle("selected", chosen);
                card.setAttribute("aria-pressed", String(chosen));
            });
            document.getElementById("selection-count").textContent = this.mode === "training"
                ? `${selection.length} / 1 PERSONAJE`
                : this.mode === "local"
                ? `EQUIPO ${this.selectingSide + 1} · ${selection.length} / 4`
                : `${selection.length} / 4 SELECCIONADOS`;
            document.getElementById("start-match").disabled = (this.mode === "training"
                ? selection.length !== 1
                : selection.length !== 4 || (this.mode === "local" && this.selections[1 - this.selectingSide].length !== 4));
            document.getElementById("start-match").textContent = this.mode === "training" ? "Entrenar" : "Entrar a la cancha";
            document.getElementById("selection-side").textContent = this.selectingSide === 0 ? "Elegir equipo local 2 →" : "← Volver al equipo local 1";
        }

        showScreen(id) {
            ["welcome-screen", "selection-screen", "fulltime-screen", "halftime-screen"].forEach(screen => {
                document.getElementById(screen).hidden = screen !== id;
            });
            if (id === "welcome-screen") {
                document.body.classList.remove("football-training-mode");
                document.getElementById("football-scoreboard").hidden = true;
                document.getElementById("football-hud").hidden = true;
                this.state = "menu";
                this.drawMenuPitch();
            }
        }

        createPlayer(team, character, lane, goalkeeper = false) {
            const sign = this.teamDirection(team);
            const member = {
                id: `${team}-${lane}-${Math.random().toString(36).slice(2, 7)}`,
                team,
                lane,
                character,
                goalkeeper,
                x: goalkeeper ? (team === 0 ? 130 : 870) : 220 + lane * 80,
                y: goalkeeper ? 500 : 350 + lane * 75,
                vx: 0,
                vy: 0,
                sign,
                radius: goalkeeper ? 22 : 17,
                stun: 0,
                invulnerable: 0,
                cooldown: 0,
                goalkeeperClearTimer: 0,
                goalkeeperPickupCooldown: 0,
                pressCooldown: 0,
                aerialCooldown: 0,
                techniqueFxUntil: 0,
                facingX: sign,
                facingY: 0,
                jump: 0,
                jumpVelocity: 0,
                state: "position",
                aiDelay: Math.random() * 0.7
            };
            if (team === 1) member.x = goalkeeper ? 870 : 780 - lane * 80;
            return member;
        }

        startMatch() {
            this.sound.unlock();
            this.sound.playTrack("match");
            this.score = [0, 0];
            this.matchTime = 90;
            this.half = 1;
            this.halftimeEndAt = 0;
            this.energy = [100, 100];
            this.specialCooldown.clear();
            const home = this.mode === "training"
                ? [roster[this.trainingCharacterIndex]]
                : this.selections[0].map(index => roster[index]);
            const away = this.mode === "local"
                ? this.selections[1].map(index => roster[index])
                : this.mode === "training"
                    ? []
                    : Array.from({ length: 4 }, (_, i) => roster[(i + this.storyRound * 2 + 4) % roster.length]);
            this.players = [];
            home.forEach((character, i) => this.players.push(this.createPlayer(0, character, i)));
            if (this.mode !== "training") {
                this.players.push(this.createPlayer(0, { name: "Portero Azul", color: "#2875bb", accent: "#b3e3ff", stats: [60, 75, 66], special: "Despeje" }, 4, true));
            }
            away.forEach((character, i) => this.players.push(this.createPlayer(1, character, i)));
            if (this.mode !== "training") {
                this.players.push(this.createPlayer(1, { name: "Portero Rojo", color: "#bd504a", accent: "#ffd5ad", stats: [60, 75, 66], special: "Despeje" }, 4, true));
            }
            this.players.find(player => player.team === 0 && !player.goalkeeper).isControlled = true;
            if (this.mode === "local") this.players.find(player => player.team === 1 && !player.goalkeeper).isControlled = true;
            if (this.mode === "training") {
                const trainee = this.players[0];
                trainee.x = 450;
                trainee.y = 500;
            }
            this.ball = {
                x: this.mode === "training" ? 475 : 500,
                y: 500, vx: 0, vy: 0, z: 0, vz: 0, owner: null, lastTouch: null,
                passTarget: null, spin: 0, specialType: null, techniqueFxUntil: 0
            };
            this.state = "playing";
            this.goalEndAt = 0;
            document.getElementById("football-scoreboard").hidden = false;
            document.getElementById("football-scoreboard").classList.toggle("training-mode", this.mode === "training");
            document.getElementById("football-hud").hidden = false;
            document.getElementById("welcome-screen").hidden = true;
            document.getElementById("selection-screen").hidden = true;
            document.getElementById("fulltime-screen").hidden = true;
            document.getElementById("halftime-screen").hidden = true;
            document.getElementById("match-clock").textContent = this.mode === "training" ? "LIBRE" : "1T · 1:30";
            this.sound.announce(this.mode === "training"
                ? "Entrenamiento libre"
                : this.mode === "story" ? `Jornada ${this.storyRound + 1}` : "¡Comienza el partido!");
        }

        handleKeyDown(event) {
            const key = event.key.toLowerCase();
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
            if (key === "escape" && this.mode === "training" && this.state === "playing") {
                this.sound.stop();
                this.showScreen("welcome-screen");
                return;
            }
            this.keys.add(key);
            if (this.state !== "playing" || event.repeat) return;
            if (key === " ") this.switchControlledPlayer(0);
            if (key === "k") this.chargeStartedAt = performance.now();
            if (key === "2" || key === "numpad2") this.chargeStartedAt = performance.now();
            if (key === "j") this.actionPassOrPressure(0);
            if (key === "1" || key === "numpad1") this.actionPassOrPressure(1);
            if (key === "l") this.actionSlideOrCross(0);
            if (key === "3" || key === "numpad3") this.actionSlideOrCross(1);
            if (key === "u") this.actionUnique(0);
            if (key === "4" || key === "numpad4") this.actionUnique(1);
            if (key === "i") this.actionJumpOrDodge(0);
            if (key === "5" || key === "numpad5") this.actionJumpOrDodge(1);
        }

        handleKeyUp(event) {
            const key = event.key.toLowerCase();
            this.keys.delete(key);
            if (!this.chargeStartedAt || this.state !== "playing") return;
            if (key === "k") this.shoot(0);
            if (key === "2" || key === "numpad2") this.shoot(1);
        }

        activateTouchAction(action) {
            if (this.state !== "playing") return;
            if (action === "k") {
                if (!this.chargeStartedAt) this.chargeStartedAt = performance.now();
                return;
            }
            if (action === "j") this.actionPassOrPressure(0);
            if (action === "l") this.actionSlideOrCross(0);
            if (action === "u") this.actionUnique(0);
            if (action === "i") this.actionJumpOrDodge(0);
            if (action === "space") this.switchControlledPlayer(0);
        }

        releaseTouchAction(action) {
            if (action === "k" && this.chargeStartedAt && this.state === "playing") this.shoot(0);
        }

        controlledTeam() {
            return this.mode === "local" ? 2 : 1;
        }

        getControlledPlayer(team) {
            let player = this.players.find(candidate => candidate.team === team && !candidate.goalkeeper && candidate.isControlled);
            if (!player) {
                player = this.players.find(candidate => candidate.team === team && !candidate.goalkeeper);
                if (player) player.isControlled = true;
            }
            return player;
        }

        switchControlledPlayer(team) {
            if (!this.ball || this.state !== "playing") return;
            const players = this.players.filter(player => player.team === team && !player.goalkeeper);
            if (players.length < 2) return;
            const currentIndex = players.findIndex(player => player.isControlled);
            const nextIndex = (currentIndex + 1) % players.length;
            players.forEach((player, index) => {
                player.isControlled = index === nextIndex;
            });
            this.updateHud();
        }

        controlPlayer(player) {
            if (!player || player.goalkeeper) return;
            this.players.forEach(teammate => {
                if (teammate.team === player.team && !teammate.goalkeeper) {
                    teammate.isControlled = teammate === player;
                    teammate.isMakingRun = false;
                }
            });
            this.updateHud();
        }

        inputFor(team) {
            if (team === 0) {
                return {
                    x: Number(this.keys.has("d") || this.touchDirections.has("right")) - Number(this.keys.has("a") || this.touchDirections.has("left")),
                    y: Number(this.keys.has("s") || this.touchDirections.has("down")) - Number(this.keys.has("w") || this.touchDirections.has("up"))
                };
            }
            return {
                x: Number(this.keys.has("arrowright")) - Number(this.keys.has("arrowleft")),
                y: Number(this.keys.has("arrowdown")) - Number(this.keys.has("arrowup"))
            };
        }

        actionPassOrPressure(team) {
            if (this.tryGoalkeeperClear(team, 480)) return;
            const player = this.controlledForAction(team);
            if (!player) return;
            if (this.ball.owner === player) {
                const teammate = this.selectPassTarget(player);
                if (!teammate) return;
                teammate.isMakingRun = true;
                const passSpeed = 350;
                this.kickBall(player, teammate.x, teammate.y, passSpeed, 10);
                this.ball.vz = 0;
                this.ball.passTarget = teammate;
                this.sound.effect(520, 0.08);
            } else {
                this.tryTackle(player, 40, 0.12);
            }
        }

        selectPassTarget(player, directionOverride = null) {
            const input = this.inputFor(player.team);
            const direction = directionOverride || (Math.hypot(input.x, input.y) > 0.01
                ? input
                : { x: player.facingX || this.teamDirection(player.team), y: player.facingY || 0 });
            const directionX = direction.x;
            const directionY = direction.y;
            const directionLength = Math.hypot(directionX, directionY) || 1;
            return this.players
                .filter(candidate => candidate.team === player.team && candidate !== player && !candidate.goalkeeper)
                .map(candidate => {
                    const dx = candidate.x - player.x;
                    const dy = candidate.y - player.y;
                    const distance = Math.max(1, Math.hypot(dx, dy));
                    const alignment = (dx * directionX + dy * directionY) / (distance * directionLength);
                    const forwardProgress = (candidate.x - player.x) * this.teamDirection(player.team);
                    const opponents = this.players.filter(opponent => opponent.team !== player.team);
                    const nearestOpponentDistance = opponents.length
                        ? Math.min(...opponents.map(opponent => this.distance(candidate, opponent)))
                        : 400;
                    const laneClearance = opponents.length
                        ? Math.min(...opponents.map(opponent => {
                            const projection = Math.max(0, Math.min(1,
                                ((opponent.x - player.x) * dx + (opponent.y - player.y) * dy)
                                / (distance * distance)));
                            const closestX = player.x + projection * dx;
                            const closestY = player.y + projection * dy;
                            return Math.hypot(opponent.x - closestX, opponent.y - closestY);
                        }))
                        : 200;
                    const space = Math.min(nearestOpponentDistance, 220);
                    return {
                        player: candidate,
                        score: alignment * 150
                            + Math.max(-100, Math.min(160, forwardProgress)) * 0.45
                            + space * 0.5
                            + Math.min(laneClearance, 180) * 0.6
                            - distance * 0.12
                    };
                })
                .sort((first, second) => second.score - first.score)[0]?.player || null;
        }

        actionSlideOrCross(team) {
            if (this.tryGoalkeeperClear(team, 560)) return;
            const player = this.controlledForAction(team);
            if (!player) return;
            const nearSideline = player.y < 215 || player.y > 785;
            if (this.ball.owner === player && nearSideline) {
                this.ball.owner = null;
                this.ball.lastTouch = player;
                this.ball.x = player.x + player.sign * 14;
                this.ball.y = player.y;
                this.ball.z = 5;
                this.ball.vz = 240;
                this.ball.vx = player.sign * 310;
                this.ball.vy = 300 - player.y;
                this.sound.effect(650, 0.12, "triangle");
            } else {
                this.tryTackle(player, 56, 0.25);
            }
        }

        actionUnique(team) {
            if (this.tryGoalkeeperClear(team, 640)) return;
            const player = this.controlledForAction(team);
            if (!player) return;
            if (player.cooldown > 0 || this.energy[team] < 28) return;
            if (this.ball.owner === player) {
                this.useBallTechnique(player, 28, 3.2);
                return;
            }
            this.useDefensiveTechnique(player, 28, 3.2);
        }

        useBallTechnique(player, energyCost, cooldown) {
            const type = player.character.type;
            const goalX = this.teamDirection(player.team) > 0 ? 1000 : 0;
            let aimY = type === "knight" ? (player.y < 500 ? 420 : 580) : 500;
            let speed = 650;
            let height = 42;
            if (type === "cyborg" || type === "volt") {
                speed = type === "volt" ? 830 : 760;
                height = 5;
            } else if (type === "monk" || type === "alchemist") {
                speed = 560;
                height = type === "monk" ? 115 : 76;
            } else if (type === "ninja" || type === "warlock") {
                speed = 670;
                height = 35;
            } else if (type === "golem") {
                speed = 600;
                height = 22;
            } else if (type === "valkyrie") {
                speed = 720;
                height = 64;
            } else if (type === "samurai") {
                speed = 710;
                height = 50;
            }
            this.energy[player.team] -= energyCost;
            player.cooldown = cooldown;
            player.techniqueFxUntil = performance.now() + 850;
            this.kickBall(player, goalX, aimY, speed, height, true);
            if (type === "ninja" || type === "warlock" || type === "alchemist") {
                this.ball.vy += (player.y < 500 ? 1 : -1) * (type === "ninja" ? 145 : 95);
            }
            if (type === "golem") {
                this.players.filter(opponent => opponent.team !== player.team && !opponent.goalkeeper
                    && this.distance(player, opponent) < 105)
                    .forEach(opponent => { opponent.stun = Math.max(opponent.stun, 0.55); });
            }
            this.sound.effect(150, 0.42, "sawtooth");
            this.sound.announce(player.character.special);
            this.showTechnique(player.character.special);
            return true;
        }

        useDefensiveTechnique(player, energyCost, cooldown) {
            const type = player.character.type;
            const opponents = this.players.filter(candidate => candidate.team !== player.team && !candidate.goalkeeper);
            const target = opponents.sort((a, b) => this.distance(player, a) - this.distance(player, b))[0];
            const targetDistance = target ? this.distance(player, target) : Infinity;
            const ballIsFree = !this.ball.owner;
            const ballDistance = this.distanceToBall(player);
            const dashType = ["ninja", "valkyrie", "volt"].includes(type);
            const areaType = type === "warlock" || type === "alchemist";
            const canReachLooseBall = ballIsFree && ballDistance <= (type === "monk" ? 130 : 95);
            if (!canReachLooseBall && (!target || targetDistance > (dashType ? 185 : areaType ? 150 : 112))) return false;

            this.energy[player.team] -= energyCost;
            player.cooldown = cooldown;
            player.techniqueFxUntil = performance.now() + 700;
            player.invulnerable = Math.max(player.invulnerable, 0.35);
            if (canReachLooseBall) {
                player.vx += (this.ball.x - player.x) / Math.max(1, ballDistance) * 290;
                player.vy += (this.ball.y - player.y) / Math.max(1, ballDistance) * 290;
                if (ballDistance < 32 && this.ball.z < 30) {
                    this.ball.owner = player;
                    this.ball.lastTouch = player;
                }
            } else if (type === "monk") {
                player.jumpVelocity = 270;
                if (this.ball.z > 12 && ballDistance < 140) {
                    this.ball.owner = null;
                    this.ball.lastTouch = player;
                    this.ball.vx = this.teamDirection(player.team) * 470;
                    this.ball.vy = player.y < 500 ? 70 : -70;
                    this.ball.vz = 28;
                }
            } else if (areaType) {
                opponents.filter(opponent => this.distance(player, opponent) < 150)
                    .forEach(opponent => {
                        opponent.stun = Math.max(opponent.stun, type === "warlock" ? 1.05 : 0.78);
                    });
            } else if (dashType) {
                const destination = this.ball.owner && this.ball.owner.team !== player.team ? this.ball.owner : target;
                const distance = this.distance(player, destination);
                player.vx += (destination.x - player.x) / Math.max(1, distance) * (type === "volt" ? 390 : 320);
                player.vy += (destination.y - player.y) / Math.max(1, distance) * (type === "volt" ? 390 : 320);
                if (distance < 48 && destination === this.ball.owner) {
                    this.ball.owner = player;
                    this.ball.lastTouch = player;
                    destination.stun = Math.max(destination.stun, 0.45);
                }
            } else if (targetDistance < 112) {
                const stun = type === "golem" ? 1.05 : type === "samurai" ? 0.85 : 0.65;
                target.stun = Math.max(target.stun, stun);
                const angle = Math.atan2(target.y - player.y, target.x - player.x);
                target.vx += Math.cos(angle) * (type === "golem" ? 300 : 230);
                target.vy += Math.sin(angle) * (type === "golem" ? 300 : 230);
                if (this.ball.owner === target) {
                    this.ball.owner = player;
                    this.ball.lastTouch = player;
                }
            }
            this.sound.effect(type === "golem" ? 115 : 220, 0.3, "sawtooth");
            this.sound.announce(player.character.special);
            this.showTechnique(player.character.special);
            return true;
        }

        actionJumpOrDodge(team) {
            if (this.tryGoalkeeperClear(team, 520)) return;
            const player = this.controlledForAction(team);
            if (!player || player.jump > 0.15) return;
            player.jumpVelocity = 220;
            player.invulnerable = 0.42;
            if (this.ball.z > 16 && this.distanceToBall(player) < 92) {
                const goalDirection = this.teamDirection(team);
                this.ball.owner = null;
                this.ball.lastTouch = player;
                this.ball.vx = goalDirection * 405;
                this.ball.vy = 0;
                this.ball.vz = 10;
                this.ball.z = 23;
                this.sound.effect(730, 0.12, "triangle");
            }
        }

        controlledForAction(team) {
            if (!this.ball || !this.players.length) return null;
            const input = this.inputFor(team);
            return this.getControlledPlayer(team);
        }

        tryGoalkeeperClear(team, power) {
            const goalkeeper = this.ball && this.ball.owner;
            if (team !== 0 || !goalkeeper || !goalkeeper.goalkeeper || goalkeeper.team !== team) return false;
            const goalX = this.teamDirection(team) > 0 ? 1000 : 0;
            this.kickBall(
                goalkeeper,
                goalX,
                Math.max(300, Math.min(700, 500 + (goalkeeper.aimY || 0) * 180)),
                power,
                34
            );
            goalkeeper.goalkeeperPickupCooldown = 0.85;
            this.sound.effect(520, 0.12, "triangle");
            return true;
        }

        shoot(team) {
            if (!this.chargeStartedAt) return;
            const duration = performance.now() - this.chargeStartedAt;
            this.chargeStartedAt = 0;
            const goalkeeperShot = team === 0 && this.ball.owner && this.ball.owner.goalkeeper;
            const player = goalkeeperShot ? this.ball.owner : this.controlledForAction(team);
            if (!player || this.ball.owner !== player) return;
            const charged = Math.min(1, duration / 1450);
            if (goalkeeperShot) {
                this.sound.effect(440 + charged * 240, 0.14, "triangle");
                this.kickBall(
                    player,
                    this.teamDirection(team) > 0 ? 1000 : 0,
                    Math.max(300, Math.min(700, 500 + (player.aimY || 0) * 180)),
                    300 + charged * 420,
                    24 + charged * 42
                );
                player.goalkeeperPickupCooldown = 0.85;
                return;
            }
            const isSpecial = this.energy[team] >= 42 && player.cooldown <= 0 && duration >= 650;
            const precision = this.precisionScore(duration);
            const power = isSpecial ? 790 + precision * 170 : 350 + charged * 200;
            if (isSpecial) {
                player.cooldown = 9;
                this.energy[team] -= 42;
                player.techniqueFxUntil = performance.now() + 850;
                this.sound.effect(150, 0.58, "sawtooth");
                this.sound.announce(player.character.special, 1.35);
                this.showTechnique(player.character.special);
            } else {
                this.sound.effect(480 + charged * 200, 0.11);
            }
            this.kickBall(player, this.teamDirection(team) > 0 ? 1000 : 0, 500, power, 28 + charged * 70, isSpecial);
            this.ball.vy += (precision - 0.5) * 95;
        }

        precisionScore(duration) {
            const phase = (duration % 840) / 840;
            const triangular = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
            const error = Math.abs(triangular - 0.72);
            return Math.max(0, 1 - error / 0.34);
        }

        showTechnique(name) {
            const hint = document.getElementById("action-hint");
            hint.textContent = name.toUpperCase();
            window.setTimeout(() => {
                if (this.state === "playing") hint.textContent = "J pase · K tiro · L barrida/centro · U técnica · I salto";
            }, 1400);
        }

        kickBall(player, targetX, targetY, speed, height, special = false) {
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            if (this.ball.passTarget) this.ball.passTarget.isMakingRun = false;
            this.ball.owner = null;
            this.ball.lastTouch = player;
            this.ball.passTarget = null;
            this.ball.x = player.x + player.sign * 18;
            this.ball.y = player.y;
            this.ball.vx = dx / length * speed;
            this.ball.vy = dy / length * speed;
            this.ball.z = 6;
            this.ball.vz = height + (special ? 35 : 0);
            this.ball.spin = Math.random() * Math.PI * 2;
            this.ball.specialType = special ? player.character.type : null;
            this.ball.techniqueFxUntil = special ? performance.now() + 1200 : 0;
        }

        tryTackle(player, reach, stun) {
            const opponents = this.players.filter(candidate => candidate.team !== player.team && !candidate.goalkeeper);
            const victim = opponents.sort((a, b) => this.distance(player, a) - this.distance(player, b))[0];
            if (victim && this.distance(player, victim) < reach && victim.invulnerable <= 0) {
                victim.stun = stun;
                if (this.ball.owner === victim) {
                    this.ball.owner = player;
                    this.ball.lastTouch = player;
                } else if (this.distanceToBall(player) < 32) {
                    this.ball.owner = player;
                }
                victim.vx += player.sign * 170;
                this.sound.effect(115, 0.11, "triangle");
                return;
            }
            if (this.distanceToBall(player) < reach && (!this.ball.owner || this.ball.owner.team !== player.team)) {
                this.ball.owner = player;
                this.ball.lastTouch = player;
            }
        }

        nearestOpponent(player) {
            return this.players.filter(candidate => candidate.team !== player.team && !candidate.goalkeeper)
                .sort((a, b) => this.distance(player, a) - this.distance(player, b))[0];
        }

        distance(first, second) {
            return Math.hypot(first.x - second.x, first.y - second.y);
        }

        distanceToBall(player) {
            return this.distance(player, this.ball);
        }

        teamDirection(team) {
            const direction = team === 0 ? 1 : -1;
            return this.half === 2 ? -direction : direction;
        }

        update(delta) {
            if (this.state === "playing") this.updateMatch(delta);
            else if (this.state === "goal" && performance.now() >= this.goalEndAt) this.resumeAfterGoal();
            else if (this.state === "halftime" && performance.now() >= this.halftimeEndAt) this.startSecondHalf();
        }

        updateMatch(delta) {
            if (this.chargeStartedAt) {
                const amount = Math.min(1, (performance.now() - this.chargeStartedAt) / 1450);
                document.getElementById("energy-value").textContent = `${Math.round(amount * 100)}% · PRECISIÓN`;
                document.getElementById("energy-fill").value = Math.max(8, amount * 100);
            }
            if (this.mode !== "training") this.matchTime = Math.max(0, this.matchTime - delta);
            const seconds = Math.ceil(this.matchTime);
            document.getElementById("match-clock").textContent = this.mode === "training"
                ? "LIBRE"
                : `${this.half}T · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
            this.energy = this.energy.map(value => Math.min(100, value + delta * 4));
            this.players.forEach(player => {
                player.cooldown = Math.max(0, player.cooldown - delta);
                player.goalkeeperPickupCooldown = Math.max(0, player.goalkeeperPickupCooldown - delta);
                player.pressCooldown = Math.max(0, player.pressCooldown - delta);
                player.stun = Math.max(0, player.stun - delta);
                player.invulnerable = Math.max(0, player.invulnerable - delta);
                player.jump = Math.max(0, player.jump + player.jumpVelocity * delta);
                if (player.jump === 0) player.jumpVelocity = 0;
                else player.jumpVelocity -= 520 * delta;
                const maxSpeed = 260;
                const speed = Math.hypot(player.vx, player.vy);
                if (speed > maxSpeed) {
                    player.vx = player.vx / speed * maxSpeed;
                    player.vy = player.vy / speed * maxSpeed;
                }
                const minX = player.goalkeeper
                    ? (this.teamDirection(player.team) > 0 ? 130 : 740)
                    : 165;
                const maxX = player.goalkeeper
                    ? (this.teamDirection(player.team) > 0 ? 260 : 870)
                    : 835;
                player.x = Math.max(minX, Math.min(maxX, player.x + player.vx * delta));
                const minY = player.goalkeeper ? 300 : 130;
                const maxY = player.goalkeeper ? 700 : 870;
                player.y = Math.max(minY, Math.min(maxY, player.y + player.vy * delta));
                const friction = Math.pow(0.88, delta * 60);
                player.vx *= friction;
                player.vy *= friction;
            });
            this.updateHuman(0, delta);
            if (this.mode === "local") this.updateHuman(1, delta);
            if (this.mode !== "training") this.updateAI(delta);
            this.resolvePlayerOverlaps();
            this.updateBall(delta);
            this.updateHud();
            if (this.mode !== "training" && this.matchTime <= 0) {
                if (this.half === 1) this.startHalftime();
                else this.endMatch();
            }
        }

        startHalftime() {
            this.state = "halftime";
            this.halftimeEndAt = performance.now() + 3500;
            this.ball = { x: 500, y: 500, vx: 0, vy: 0, z: 0, vz: 0, owner: null, lastTouch: null, passTarget: null, spin: 0 };
            document.getElementById("halftime-screen").hidden = false;
            this.sound.announce("Descanso");
        }

        startSecondHalf() {
            this.half = 2;
            this.matchTime = 90;
            this.state = "playing";
            document.getElementById("halftime-screen").hidden = true;
            this.players.forEach(player => {
                player.x = player.goalkeeper
                    ? (this.teamDirection(player.team) > 0 ? 130 : 870)
                    : 1000 - player.x;
                player.sign = this.teamDirection(player.team);
                player.facingX = player.sign;
                player.y = player.goalkeeper ? 500 : player.y;
                player.vx = 0;
                player.vy = 0;
                player.stun = 0;
            });
            this.ball = { x: 500, y: 500, vx: 0, vy: 0, z: 0, vz: 0, owner: null, lastTouch: null, passTarget: null, spin: 0 };
            document.getElementById("match-clock").textContent = "2T · 1:30";
            this.sound.announce("¡Comienza el segundo tiempo!");
        }

        resolvePlayerOverlaps() {
            const minimumDistance = 46;
            for (let pass = 0; pass < 20; pass++) {
                for (let i = 0; i < this.players.length; i++) {
                    for (let j = i + 1; j < this.players.length; j++) {
                        const first = this.players[i];
                        const second = this.players[j];
                        let dx = second.x - first.x;
                        let dy = second.y - first.y;
                        let distance = Math.hypot(dx, dy);
                        if (distance >= minimumDistance) continue;
                        if (distance === 0) {
                            const angle = (i * 17 + j * 31) * 0.37;
                            dx = Math.cos(angle);
                            dy = Math.sin(angle);
                            distance = 1;
                        }
                        const separation = (minimumDistance - distance) / 2;
                        const offsetX = dx / distance * separation;
                        const offsetY = dy / distance * separation;
                        const firstMinX = first.goalkeeper ? (this.teamDirection(first.team) > 0 ? 130 : 740) : 165;
                        const firstMaxX = first.goalkeeper ? (this.teamDirection(first.team) > 0 ? 260 : 870) : 835;
                        const secondMinX = second.goalkeeper ? (this.teamDirection(second.team) > 0 ? 130 : 740) : 165;
                        const secondMaxX = second.goalkeeper ? (this.teamDirection(second.team) > 0 ? 260 : 870) : 835;
                        first.x = Math.max(firstMinX, Math.min(firstMaxX, first.x - offsetX));
                        first.y = Math.max(first.goalkeeper ? 300 : 130, Math.min(first.goalkeeper ? 700 : 870, first.y - offsetY));
                        second.x = Math.max(secondMinX, Math.min(secondMaxX, second.x + offsetX));
                        second.y = Math.max(second.goalkeeper ? 300 : 130, Math.min(second.goalkeeper ? 700 : 870, second.y + offsetY));
                    }
                }
            }
        }

        updateHuman(team, delta) {
            const goalkeeperOwner = this.ball.owner && this.ball.owner.goalkeeper
                ? this.ball.owner
                : null;
            if (goalkeeperOwner && goalkeeperOwner.team !== team) return;
            const input = this.inputFor(team);
            if (Math.hypot(input.x, input.y) < 0.01) return;
            const keeperHasBall = goalkeeperOwner && goalkeeperOwner.team === team;
            const player = keeperHasBall ? this.ball.owner : this.getControlledPlayer(team);
            if (!player || player.stun > 0) return;
            const length = Math.hypot(input.x, input.y) || 1;
            player.facingX = input.x / length;
            player.facingY = input.y / length;
            player.vx += input.x / length * 250 * delta * 7;
            player.vy += input.y / length * 250 * delta * 7;
            if (keeperHasBall) {
                player.aimX = input.x;
                player.aimY = input.y;
            }
            player.state = "run";
        }

        updateAI(delta) {
            const settings = difficultySettings[this.difficulty] || difficultySettings.normal;
            const goalkeeperInPossession = this.ball.owner && this.ball.owner.goalkeeper
                ? this.ball.owner
                : null;
            this.players.forEach(player => {
                if (player.goalkeeper) {
                    this.updateGoalkeeper(player, delta, settings);
                    return;
                }
                if (this.ball.passTarget === player) {
                    this.updateTeammateAI(player, delta);
                    return;
                }
                if (goalkeeperInPossession) {
                    if (this.distance(player, goalkeeperInPossession) < 125) {
                        this.moveAwayForGoalkeeperKick(player, goalkeeperInPossession, delta);
                    }
                    return;
                }
                if (this.mode === "local") {
                    if (!player.isControlled || this.ball.passTarget === player) this.updateTeammateAI(player, delta);
                    return;
                }
                if (player.team === 1) {
                    this.updateFieldAI(player, delta, settings);
                } else if (!player.isControlled || this.ball.passTarget === player) {
                    this.updateTeammateAI(player, delta);
                }
            });
        }

        moveAwayForGoalkeeperKick(player, goalkeeper, delta) {
            const kickDirection = this.teamDirection(goalkeeper.team);
            const isGoalkeeperTeammate = player.team === goalkeeper.team;
            const lane = player.lane;
            const distance = isGoalkeeperTeammate ? 160 + lane * 70 : 500 - lane * 65;
            const targetX = Math.max(175, Math.min(825, goalkeeper.x + kickDirection * distance));
            const targetY = 220 + lane * 180;
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            player.vx += dx / length * 220 * delta;
            player.vy += dy / length * 220 * delta;
            const speed = Math.hypot(player.vx, player.vy);
            if (speed > 110) {
                player.vx = player.vx / speed * 110;
                player.vy = player.vy / speed * 110;
            }
            player.state = "position";
        }

        updateGoalkeeper(player, delta) {
            if (this.ball.owner === player && player.team === 0) return;
            const targetY = Math.max(300, Math.min(700, this.ball.y));
            const attackDirection = this.teamDirection(player.team);
            const homeX = attackDirection > 0 ? 130 : 870;
            const targetX = attackDirection > 0
                ? Math.max(130, Math.min(220, 130 + Math.max(0, 260 - this.ball.x) * 0.35))
                : Math.min(870, Math.max(780, 870 - Math.max(0, this.ball.x - 740) * 0.35));
            player.vy += Math.max(-220, Math.min(220, targetY - player.y)) * delta * 4;
            player.vx += (targetX - player.x) * delta * 2;
            if (this.ball.owner === player) {
                player.goalkeeperClearTimer += delta;
                if (player.goalkeeperClearTimer >= 0.45) {
                    player.goalkeeperClearTimer = 0;
                    this.kickBall(player, attackDirection > 0 ? 590 : 410, 500, 360, 42);
                    player.goalkeeperPickupCooldown = 1;
                }
                return;
            }
            if (!this.ball.owner && player.goalkeeperPickupCooldown <= 0
                && this.distanceToBall(player) < 42 && this.ball.z < 38) {
                this.ball.owner = player;
                this.ball.lastTouch = player;
                player.goalkeeperClearTimer = 0;
            }
        }

        updateFieldAI(player, delta, settings) {
            if (player.stun > 0) return;
            player.aiDelay = Math.max(0, player.aiDelay - delta);
            const owns = this.ball.owner === player;
            const teamOwns = this.ball.owner && this.ball.owner.team === player.team;
            const attackDirection = this.teamDirection(player.team);
            const opponentHasBall = this.ball.owner && this.ball.owner.team !== player.team;
            const ownGoalThreat = attackDirection > 0 ? this.ball.x < 320 : this.ball.x > 680;
            const closestDefender = this.players
                .filter(other => other.team === player.team && !other.goalkeeper)
                .sort((a, b) => this.distanceToBall(a) - this.distanceToBall(b))[0];
            if (this.ball.z > 30 && this.distanceToBall(player) < 78 && player.aerialCooldown <= 0) {
                player.aerialCooldown = 1.1;
                player.jumpVelocity = 210;
                this.ball.lastTouch = player;
                this.ball.vx = attackDirection * (opponentHasBall ? 330 : 430);
                this.ball.vy = player.team === 0 ? -25 : 25;
                this.ball.vz = 15;
                this.sound.effect(690, 0.1, "triangle");
            }
            if (player.aerialCooldown > 0) player.aerialCooldown = Math.max(0, player.aerialCooldown - delta);
            let targetX;
            let targetY;
            if (owns) {
                const goalX = attackDirection > 0 ? 1000 : 0;
                const goalDistance = Math.abs(goalX - player.x);
                const closestOpponent = this.players
                    .filter(other => other.team !== player.team && !other.goalkeeper)
                    .sort((a, b) => this.distance(player, a) - this.distance(player, b))[0];
                const pressure = closestOpponent ? this.distance(player, closestOpponent) : Infinity;
                const passTarget = this.selectPassTarget(player, { x: attackDirection, y: 0 });
                const forwardPass = passTarget
                    && (passTarget.x - player.x) * attackDirection > 55
                    && this.distance(player, passTarget) < 430;
                if (forwardPass && goalDistance > 280 && pressure < 115 && player.aiDelay === 0
                    && Math.random() < delta * (0.65 + settings.aggression * 0.9)) {
                    player.aiDelay = 0.65 + settings.reaction * 0.25;
                    this.kickBall(player, passTarget.x, passTarget.y, 390, 12);
                    this.ball.passTarget = passTarget;
                    passTarget.isMakingRun = true;
                    player.state = "pass";
                    return;
                }
                targetX = attackDirection > 0 ? 750 : 250;
                targetY = 500;
                if (closestOpponent) {
                    targetY = Math.max(300, Math.min(700,
                        player.y + (player.y <= closestOpponent.y ? -175 : 175)));
                }
                player.state = "attack";
                if ((player.y < 215 || player.y > 785) && goalDistance < 500 && player.aiDelay === 0) {
                    player.aiDelay = settings.reaction + 0.4;
                    this.crossBall(player);
                    return;
                }
                const clearShot = goalDistance <= 540 && player.y >= 330 && player.y <= 670;
                const closeShot = goalDistance < 380;
                if ((clearShot || closeShot) && player.cooldown <= 0 && player.aiDelay === 0) {
                    player.aiDelay = settings.reaction * 0.35 + Math.random() * 0.15;
                    this.aiShoot(player, settings);
                    return;
                }
            } else if (teamOwns) {
                if (ownGoalThreat) {
                    targetX = attackDirection > 0 ? 300 + player.lane * 28 : 700 - player.lane * 28;
                    targetY = 250 + player.lane * 150;
                } else {
                    const laneOffset = (player.lane - 1.5) * 118;
                    targetX = this.ball.owner.x + attackDirection * (90 + (player.lane % 2) * 55);
                    targetY = Math.max(185, Math.min(815, this.ball.owner.y + laneOffset));
                }
                player.state = "run";
            } else {
                const isChaser = closestDefender === player;
                const laneOffset = (player.lane - 1.5) * 62;
                if (ownGoalThreat && !isChaser) {
                    targetX = attackDirection > 0 ? 300 + player.lane * 28 : 700 - player.lane * 28;
                    targetY = 250 + player.lane * 150;
                } else {
                    targetX = this.ball.x - attackDirection * (isChaser ? 24 : 55 + player.lane * 32);
                    targetY = this.ball.y + (isChaser ? 0 : laneOffset);
                }
                targetX = Math.max(190, Math.min(810, targetX));
                targetY = Math.max(185, Math.min(815, targetY));
                player.state = "defend";
                if (isChaser && this.distanceToBall(player) < 34 && player.aiDelay === 0 && this.ball.z < 20) {
                    this.ball.owner = player;
                    this.ball.lastTouch = player;
                    player.aiDelay = settings.reaction;
                } else if (opponentHasBall && this.distance(player, this.ball.owner) < 48
                    && player.cooldown <= 0 && Math.random() < delta * settings.aggression * 0.65) {
                    this.tryTackle(player, 52, 0.3);
                }
            }
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            const speed = 250;
            player.vx += dx / length * speed * delta * (owns ? 3.4 : 3.2);
            player.vy += dy / length * speed * delta * (owns ? 3.4 : 3.2);
            if (!owns && opponentHasBall && closestDefender === player
                && this.distance(player, this.ball.owner) < 72 && player.pressCooldown <= 0) {
                if (this.distance(player, this.ball.owner) < 58 && player.cooldown <= 0
                    && this.energy[player.team] >= 28) {
                    this.useDefensiveTechnique(player, 28, 3.2);
                } else {
                    this.tryTackle(player, 76, 0.3);
                }
                player.pressCooldown = Math.max(0.45, settings.reaction);
            }
        }

        crossBall(player) {
            const attackDirection = this.teamDirection(player.team);
            const targetX = attackDirection > 0 ? 850 : 150;
            const targetY = 500 + (Math.random() - 0.5) * 180;
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            this.ball.owner = null;
            this.ball.lastTouch = player;
            this.ball.x = player.x + attackDirection * 14;
            this.ball.y = player.y;
            this.ball.vx = dx / length * 360;
            this.ball.vy = dy / length * 360;
            this.ball.z = 5;
            this.ball.vz = 245;
        }

        updateTeammateAI(player, delta) {
            const carrier = this.ball.owner;
            const direction = this.teamDirection(player.team);
            const laneOffset = (player.lane - 1.5) * 76;
            if (this.ball.passTarget === player) {
                const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
                const interceptTime = Math.max(0.1, Math.min(0.8,
                    this.distanceToBall(player) / (ballSpeed + 250)));
                const targetX = this.ball.x + this.ball.vx * interceptTime;
                const targetY = this.ball.y + this.ball.vy * interceptTime;
                const dx = targetX - player.x;
                const dy = targetY - player.y;
                const length = Math.max(1, Math.hypot(dx, dy));
                player.vx += dx / length * 250 * delta * 2.2;
                player.vy += dy / length * 250 * delta * 2.2;
                player.state = "run";
                return;
            }
            const ownGoalThreat = direction > 0 ? this.ball.x < 320 : this.ball.x > 680;
            if (carrier && carrier.team !== player.team) {
                const teammates = this.players
                    .filter(other => other.team === player.team && !other.goalkeeper)
                    .sort((a, b) => this.distance(a, carrier) - this.distance(b, carrier));
                const isChaser = teammates[0] === player;
                const defensiveLane = (player.lane - 1.5) * 125;
                const x = isChaser
                    ? carrier.x - direction * 16
                    : Math.max(210, Math.min(790, carrier.x - direction * (90 + player.lane * 18)));
                const y = isChaser
                    ? carrier.y
                    : Math.max(200, Math.min(800, carrier.y + defensiveLane));
                const dx = x - player.x;
                const dy = y - player.y;
                const length = Math.max(1, Math.hypot(dx, dy));
                player.vx += dx / length * 250 * delta * (isChaser ? 2.7 : 2.1);
                player.vy += dy / length * 250 * delta * (isChaser ? 2.7 : 2.1);
                player.state = isChaser ? "defend" : "position";
                if (isChaser && this.distance(player, carrier) < 48 && player.cooldown <= 0) {
                    this.tryTackle(player, 58, 0.32);
                }
                return;
            }
            const closestTeammate = this.players
                .filter(other => other.team === player.team && !other.goalkeeper)
                .sort((a, b) => this.distanceToBall(a) - this.distanceToBall(b))[0];
            const isChaser = closestTeammate === player;
            let x;
            let y;
            if (ownGoalThreat && carrier !== player && (carrier || !isChaser)) {
                x = direction > 0 ? 300 + player.lane * 28 : 700 - player.lane * 28;
                y = 250 + player.lane * 150;
            } else {
                x = carrier
                    ? carrier.x + direction * (75 + player.lane * 30)
                    : this.ball.x - direction * (isChaser ? 18 : 65 + player.lane * 24);
                y = carrier
                    ? carrier.y + laneOffset
                    : this.ball.y + (isChaser ? 0 : laneOffset);
            }
            if (carrier === player) {
                x = direction > 0 ? 950 : 50;
                y = 500;
            }
            x = Math.max(190, Math.min(810, x));
            y = Math.max(185, Math.min(815, y));
            const dx = x - player.x;
            const dy = y - player.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            player.vx += dx / length * 250 * delta * 2.2;
            player.vy += dy / length * 250 * delta * 2.2;
        }

        aiShoot(player, settings) {
            const precision = settings.accuracy * (0.72 + Math.random() * 0.28);
            const aimY = 500 + (Math.random() - 0.5) * (1 - precision) * 300;
            const power = 510 + precision * 310;
            const goalX = this.teamDirection(player.team) > 0 ? 1000 : 0;
            if (precision > 0.82 && this.energy[player.team] >= 42 && player.cooldown <= 0) {
                this.useBallTechnique(player, 42, 8);
                player.aiDelay = Math.max(player.aiDelay, settings.reaction);
                return;
            }
            this.kickBall(player, goalX, aimY, power, 48 + precision * 50, precision > 0.82);
            player.cooldown = 4.2;
            if (precision > 0.85 && this.energy[player.team] > 45) {
                this.energy[player.team] -= 42;
                this.sound.effect(160, 0.5, "sawtooth");
            }
        }

        updateBall(delta) {
            const ball = this.ball;
            if (ball.owner) {
                const owner = ball.owner;
                const direction = this.teamDirection(owner.team);
                ball.x = owner.x + direction * 17;
                ball.y = owner.y - owner.jump * 0.1;
                ball.z = owner.jump * 0.42;
            } else {
                ball.x += ball.vx * delta;
                ball.y += ball.vy * delta;
                ball.z += ball.vz * delta;
                ball.vz -= 330 * delta;
                ball.vx *= Math.pow(0.992, delta * 60);
                ball.vy *= Math.pow(0.992, delta * 60);
                if (ball.z < 0) {
                    ball.z = 0;
                    ball.vz = Math.abs(ball.vz) > 45 ? Math.abs(ball.vz) * 0.34 : 0;
                    ball.vx *= 0.78;
                    ball.vy *= 0.78;
                }
                if (ball.y < 130 || ball.y > 870) {
                    ball.y = Math.max(130, Math.min(870, ball.y));
                    ball.vy *= -0.68;
                }
            }
            const crossedGoalLine = !ball.owner && (ball.x <= 115 || ball.x >= 885);
            const insideGoalMouth = Math.abs(ball.y - 500) <= 82;
            if (crossedGoalLine && insideGoalMouth && ball.z < 35) {
                const rightGoalTeam = this.teamDirection(0) > 0 ? 0 : 1;
                this.registerGoal(ball.x > 500 ? rightGoalTeam : 1 - rightGoalTeam);
            } else {
                if (!ball.owner && (ball.x < 115 || ball.x > 885)) {
                    ball.vx *= -0.7;
                    ball.x = Math.max(115, Math.min(885, ball.x));
                }
                if (!ball.owner) this.tryCollectBall();
            }
            ball.spin += delta * Math.hypot(ball.vx, ball.vy) * 0.02;
        }

        tryCollectBall() {
            const candidates = this.players.filter(player => !player.goalkeeper && player.stun <= 0)
                .sort((a, b) => this.distanceToBall(a) - this.distanceToBall(b));
            const intendedReceiver = this.ball.passTarget;
            const nearestCandidate = candidates[0];
            const nearest = intendedReceiver
                && this.distanceToBall(intendedReceiver) < 34
                && (!nearestCandidate || this.distanceToBall(intendedReceiver) <= this.distanceToBall(nearestCandidate) + 6)
                ? intendedReceiver
                : nearestCandidate;
            if (nearest && this.distanceToBall(nearest) < 20 && this.ball.z < 24) {
                this.ball.owner = nearest;
                this.ball.lastTouch = nearest;
                nearest.state = "control";
                this.ball.passTarget = null;
                nearest.isMakingRun = false;
                this.controlPlayer(nearest);
            } else if (nearest && this.ball.passTarget && nearest !== this.ball.passTarget) {
                this.ball.passTarget.isMakingRun = false;
                this.ball.passTarget = null;
            }
        }

        registerGoal(team) {
            this.score[team] += 1;
            this.state = "goal";
            this.celebration = Math.floor(Math.random() * celebrations.length);
            this.goalEndAt = performance.now() + 2600;
            this.goalStartedAt = performance.now();
            this.goalTeam = team;
            this.ball.owner = null;
            this.ball.vx = 0;
            this.ball.vy = 0;
            document.getElementById("score-blue").textContent = this.score[0];
            document.getElementById("score-red").textContent = this.score[1];
            document.getElementById("celebration-label").textContent = celebrations[this.celebration].toUpperCase();
            document.getElementById("goal-caption").textContent = team === 0 ? "¡El equipo azul toma la delantera!" : "¡El equipo rojo responde con fuerza!";
            document.getElementById("goal-screen").hidden = false;
            this.sound.effect(880, 0.7, "triangle");
            this.sound.announce("¡Gol!", 1.5);
            if (this.mode === "story" && team === 0) {
                this.storyRound = Math.min(this.storyRound + 1, this.storyNames.length);
                localStorage.setItem("footballStoryRound", String(this.storyRound));
            }
        }

        resumeAfterGoal() {
            document.getElementById("goal-screen").hidden = true;
            if (this.matchTime <= 0) {
                this.endMatch();
                return;
            }
            this.players.forEach(player => {
                player.x = player.goalkeeper
                    ? (this.teamDirection(player.team) > 0 ? 130 : 870)
                    : (this.teamDirection(player.team) > 0 ? 170 + Math.random() * 280 : 550 + Math.random() * 280);
                player.sign = this.teamDirection(player.team);
                player.facingX = player.sign;
                player.y = player.goalkeeper ? 500 : 200 + Math.random() * 600;
                player.vx = 0;
                player.vy = 0;
                player.stun = 0;
            });
            this.ball = { x: 500, y: 500, vx: 0, vy: 0, z: 0, vz: 0, owner: null, lastTouch: null, passTarget: null, spin: 0 };
            this.state = "playing";
        }

        endMatch() {
            this.state = "finished";
            this.sound.stop();
            document.getElementById("football-scoreboard").classList.remove("training-mode");
            document.getElementById("football-scoreboard").hidden = true;
            document.getElementById("football-hud").hidden = true;
            document.getElementById("final-score").textContent = `AZUL ${this.score[0]} — ${this.score[1]} ROJO`;
            const caption = this.score[0] === this.score[1] ? "Un empate digno de la final." : this.score[0] > this.score[1] ? "¡La victoria es del equipo azul!" : "¡El equipo rojo se lleva el partido!";
            document.getElementById("final-caption").textContent = caption;
            document.getElementById("fulltime-screen").hidden = false;
        }

        updateHud() {
            const goalkeeperOwner = this.ball && this.ball.owner && this.ball.owner.goalkeeper
                && this.ball.owner.team === 0
                ? this.ball.owner
                : null;
            const controlled = this.players.find(player => player.isControlled && player.team === 0) || this.players.find(player => player.team === 0 && !player.goalkeeper);
            if (goalkeeperOwner) document.getElementById("player-name").textContent = "PORTERO AZUL";
            else if (controlled) document.getElementById("player-name").textContent = controlled.character.name.toUpperCase();
            const keeperHasBall = Boolean(goalkeeperOwner);
            document.getElementById("action-hint").textContent = keeperHasBall
                ? "Mantén K para cargar el despeje · suelta para patear"
                : this.mode === "training"
                    ? "ENTRENAMIENTO · U habilidad · K tiro · I salto · ESC volver al menú"
                    : "J pase · K tiro · L barrida/centro · U técnica · I salto";
            const value = Math.round(this.energy[0]);
            if (!this.chargeStartedAt) {
                document.getElementById("energy-value").textContent = `${value}%`;
                document.getElementById("energy-fill").value = value;
            }
        }

        drawMenuPitch() {
            this.ctx.save();
            this.drawPitch();
            this.drawGoal(this.ctx, 100, 500, 1);
            this.drawGoal(this.ctx, 900, 500, -1);
            this.drawPlayer({ x: 425, y: 470, team: 0, character: roster[0], jump: 0, radius: 14, state: "idle", invulnerable: 0 }, 0);
            this.drawPlayer({ x: 565, y: 530, team: 1, character: roster[7], jump: 0, radius: 14, state: "idle", invulnerable: 0 }, 0);
            this.drawBall({ x: 500, y: 500, z: 0, spin: 0 });
            this.ctx.restore();
        }

        drawPitch() {
            const ctx = this.ctx;
            const w = this.screenWidth;
            const h = this.screenHeight;
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, "#263d3c");
            gradient.addColorStop(1, "#14251f");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#16252a";
            ctx.fillRect(0, 0, w, 105);
            for (let i = 0; i < 32; i++) {
                const x = i * 33 + (i % 3) * 4;
                ctx.fillStyle = i % 2 ? "#65706b" : "#a27c54";
                ctx.fillRect(x, 39 + Math.sin(i * 2) * 4, 13, 25);
                ctx.fillStyle = "#465258";
                ctx.fillRect(x - 4, 30 + Math.cos(i * 2) * 3, 21, 15);
                ctx.fillStyle = i % 2 ? "#65706b" : "#a27c54";
                ctx.fillRect(x, 930 + Math.sin(i * 2) * 4, 13, 25);
                ctx.fillStyle = "#465258";
                ctx.fillRect(x - 4, 921 + Math.cos(i * 2) * 3, 21, 15);
            }
            ctx.fillStyle = "#39764c";
            ctx.beginPath();
            ctx.moveTo(115, 115);
            ctx.lineTo(885, 115);
            ctx.lineTo(885, 885);
            ctx.lineTo(115, 885);
            ctx.closePath();
            ctx.fill();
            for (let stripe = 0; stripe < 10; stripe++) {
                const x = 115 + stripe * 77;
                ctx.fillStyle = stripe % 2 ? "#39804f" : "#428755";
                ctx.beginPath();
                ctx.moveTo(x, 115);
                ctx.lineTo(x + 77, 115);
                ctx.lineTo(x + 77, 885);
                ctx.lineTo(x, 885);
                ctx.closePath();
                ctx.fill();
            }
            ctx.strokeStyle = "rgba(232,247,221,.76)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(115, 115); ctx.lineTo(885, 115); ctx.lineTo(885, 885); ctx.lineTo(115, 885); ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(500, 115); ctx.lineTo(500, 885); ctx.stroke();
            ctx.beginPath();
            ctx.arc(500, 500, 100, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "#eaf4d7";
            ctx.beginPath(); ctx.arc(500, 500, 4, 0, Math.PI * 2); ctx.fill();
            this.drawBox(115, 285, 145, 430);
            this.drawBox(885, 285, -145, 430);
            this.drawBox(115, 380, 63, 240);
            this.drawBox(885, 380, -63, 240);
            ctx.fillStyle = "rgba(8,15,12,.36)";
            ctx.fillRect(0, 955, w, h - 955);
        }

        drawBox(x, y, width, height) {
            const ctx = this.ctx;
            ctx.strokeStyle = "rgba(232,247,221,.76)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            ctx.beginPath();
            ctx.ellipse(x + width, y + height / 2, Math.max(12, width * 0.18), height * 0.22, 0, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
        }

        drawGoal(ctx, x, y, direction) {
            ctx.save();
            ctx.strokeStyle = "#dce6df";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(x, y - 88);
            ctx.lineTo(x + direction * 58, y - 80);
            ctx.lineTo(x + direction * 58, y + 80);
            ctx.lineTo(x, y + 88);
            ctx.stroke();
            ctx.strokeStyle = "rgba(231,244,233,.35)";
            ctx.lineWidth = 1;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(x, y + i * 32);
                ctx.lineTo(x + direction * 58, y + i * 30);
                ctx.stroke();
            }
            ctx.restore();
        }

        drawPlayer(player, time) {
            const ctx = this.ctx;
            const character = player.character;
            const x = player.x;
            const floorY = player.y;
            const jump = player.jump || 0;
            const y = floorY - jump;
            const teamColor = player.team === 0 ? "#5cbaff" : "#fa7567";
            const accent = character.accent || "#fff";
            const scale = 0.92 + Math.max(0, Math.min(1, (floorY - 100) / 380)) * 0.3;
            ctx.save();
            ctx.translate(x, floorY);
            ctx.scale(scale, scale * this.spriteYCompensation);
            ctx.fillStyle = `rgba(4,10,8,${Math.max(.13, .3 - jump / 460)})`;
            ctx.beginPath();
            ctx.ellipse(0, 3, player.radius * Math.max(.48, 1 - jump / 170), 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(0, -jump);
            if (player.invulnerable > 0 && Math.floor(time * 18) % 2) ctx.globalAlpha = 0.65;
            const running = player.state === "run" || player.state === "attack";
            const stride = running ? Math.sin(time * 18 + x * .1) * 3 : 0;
            ctx.fillStyle = "#182128";
            ctx.fillRect(-7, -5 + stride, 5, 10);
            ctx.fillRect(3, -5 - stride, 5, 10);
            ctx.fillStyle = teamColor;
            ctx.fillRect(-10, -22, 20, 21);
            const celebrating = this.state === "goal" && player.team === this.goalTeam;
            const celebrationPhase = time * 8 + (player.lane || 0);
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 5;
            ctx.lineCap = "square";
            ctx.beginPath();
            if (celebrating && this.celebration === 0) {
                ctx.moveTo(-8, -29); ctx.lineTo(-13, -39);
                ctx.moveTo(8, -29); ctx.lineTo(13, -39);
            } else if (celebrating && this.celebration === 1) {
                ctx.moveTo(-8, -29); ctx.lineTo(-15, -27);
                ctx.moveTo(8, -29); ctx.lineTo(15, -27);
            } else if (celebrating && this.celebration === 2) {
                ctx.moveTo(-8, -29); ctx.lineTo(-14, -35 + Math.sin(celebrationPhase) * 4);
                ctx.moveTo(8, -29); ctx.lineTo(14, -35 - Math.sin(celebrationPhase) * 4);
            } else if (celebrating && this.celebration === 3) {
                ctx.moveTo(-8, -29); ctx.lineTo(-15, -27);
                ctx.moveTo(8, -29); ctx.lineTo(11, -40);
            } else if (celebrating) {
                ctx.moveTo(-8, -29); ctx.lineTo(-15, -24);
                ctx.moveTo(8, -29); ctx.lineTo(15, -24);
            } else {
                ctx.moveTo(-8, -29); ctx.lineTo(-13, -25 + stride);
                ctx.moveTo(8, -29); ctx.lineTo(13, -25 - stride);
            }
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.fillRect(-10, -22, 20, 4);
            ctx.fillStyle = character.color;
            ctx.fillRect(-7, -35, 14, 14);
            ctx.fillStyle = "#f1bd91";
            ctx.fillRect(-6, -47, 12, 12);
            ctx.fillStyle = accent;
            ctx.fillRect(-7, -49, 14, 5);
            if (character.type === "ninja") {
                ctx.fillStyle = "#22202d";
                ctx.fillRect(-8, -44, 16, 4);
                ctx.fillStyle = accent;
                ctx.fillRect(3, -44, 4, 2);
            } else if (character.type === "samurai") {
                ctx.fillStyle = "#d9d9d0";
                ctx.fillRect(-2, -54, 4, 8);
                ctx.fillRect(5, -53, 4, 4);
            } else if (character.type === "cyborg") {
                ctx.fillStyle = accent;
                ctx.fillRect(-8, -37, 16, 3);
                ctx.fillRect(-2, -27, 4, 4);
            } else if (character.type === "monk") {
                ctx.fillStyle = "#f4d78a";
                ctx.fillRect(-9, -50, 18, 3);
            } else if (character.type === "warlock") {
                ctx.fillStyle = "#382d54";
                ctx.fillRect(-9, -50, 18, 5);
            } else if (character.type === "valkyrie") {
                ctx.fillStyle = "#f5e7bf";
                ctx.fillRect(-9, -53, 4, 8);
                ctx.fillRect(5, -53, 4, 8);
            } else if (character.type === "golem") {
                ctx.fillStyle = "#87785e";
                ctx.fillRect(-9, -39, 18, 6);
                ctx.fillRect(-9, -51, 18, 6);
            } else if (character.type === "volt") {
                ctx.fillStyle = "#f9d953";
                ctx.fillRect(5, -49, 5, 3);
                ctx.fillRect(-8, -39, 5, 3);
            } else if (character.type === "knight") {
                ctx.fillStyle = "#d5c79c";
                ctx.fillRect(-8, -50, 16, 7);
                ctx.fillStyle = "#3c4143";
                ctx.fillRect(-2, -48, 4, 2);
            } else if (character.type === "alchemist") {
                ctx.fillStyle = "#d5ced0";
                ctx.fillRect(-10, -38, 20, 4);
            }
            ctx.fillStyle = accent;
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2;
            if (character.type === "samurai") {
                ctx.beginPath();
                ctx.moveTo(-7, -48); ctx.lineTo(-13, -56); ctx.lineTo(-4, -53);
                ctx.moveTo(7, -48); ctx.lineTo(13, -56); ctx.lineTo(4, -53);
                ctx.stroke();
                ctx.fillRect(-9, -30, 18, 3);
            } else if (character.type === "ninja") {
                ctx.fillRect(-10, -43, 20, 3);
                ctx.beginPath();
                ctx.moveTo(-9, -42); ctx.lineTo(-17, -38); ctx.lineTo(-11, -36);
                ctx.stroke();
                ctx.fillRect(-8, -18, 16, 2);
            } else if (character.type === "cyborg") {
                ctx.fillRect(-12, -25, 4, 9);
                ctx.fillRect(8, -25, 4, 9);
                ctx.fillRect(-6, -42, 12, 3);
                ctx.beginPath();
                ctx.arc(0, -28, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (character.type === "monk") {
                ctx.beginPath();
                ctx.arc(0, -48, 2, 0, Math.PI * 2);
                ctx.arc(-3, -47, 1.5, 0, Math.PI * 2);
                ctx.arc(3, -47, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-9, -20); ctx.lineTo(8, -34); ctx.lineTo(10, -30); ctx.lineTo(-6, -18);
                ctx.fill();
            } else if (character.type === "warlock") {
                ctx.beginPath();
                ctx.moveTo(-9, -43); ctx.lineTo(0, -58); ctx.lineTo(9, -43);
                ctx.closePath();
                ctx.stroke();
                ctx.fillRect(-5, -48, 3, 2);
                ctx.fillRect(2, -48, 3, 2);
            } else if (character.type === "valkyrie") {
                ctx.beginPath();
                ctx.moveTo(-9, -27); ctx.lineTo(-17, -33); ctx.lineTo(-11, -23);
                ctx.moveTo(9, -27); ctx.lineTo(17, -33); ctx.lineTo(11, -23);
                ctx.stroke();
                ctx.fillRect(-5, -51, 10, 2);
            } else if (character.type === "golem") {
                ctx.fillRect(-14, -34, 5, 12);
                ctx.fillRect(9, -34, 5, 12);
                ctx.strokeStyle = "#342f2b";
                ctx.beginPath();
                ctx.moveTo(-4, -35); ctx.lineTo(1, -30); ctx.lineTo(-2, -25); ctx.lineTo(4, -21);
                ctx.stroke();
            } else if (character.type === "volt") {
                ctx.beginPath();
                ctx.moveTo(-4, -46); ctx.lineTo(1, -52); ctx.lineTo(-1, -47);
                ctx.lineTo(5, -49); ctx.lineTo(-2, -40); ctx.lineTo(0, -45);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-12, -16); ctx.lineTo(-16, -20); ctx.lineTo(-10, -25);
                ctx.stroke();
            } else if (character.type === "knight") {
                ctx.fillRect(-13, -27, 5, 10);
                ctx.fillRect(8, -27, 5, 10);
                ctx.beginPath();
                ctx.moveTo(0, -51); ctx.lineTo(5, -59); ctx.lineTo(4, -50);
                ctx.fill();
                ctx.fillStyle = "#f1bd91";
                ctx.fillRect(-3, -45, 6, 2);
            } else if (character.type === "alchemist") {
                ctx.fillRect(-12, -53, 24, 3);
                ctx.fillRect(-7, -58, 14, 5);
                ctx.fillStyle = "#f3a6b4";
                ctx.fillRect(8, -17, 5, 7);
                ctx.strokeStyle = accent;
                ctx.strokeRect(7, -18, 7, 8);
            }
            if (player.goalkeeper) {
                ctx.strokeStyle = accent;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -28, 15, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = "#f4f6e9";
            ctx.font = "bold 7px Rajdhani, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(player.goalkeeper ? "GK" : character.name.slice(0, 3).toUpperCase(), 0, -12);
            if (player.stun > 0) {
                ctx.fillStyle = "#ffe58c";
                ctx.font = "bold 17px sans-serif";
                ctx.fillText("✦", 0, -59 - Math.sin(time * 12) * 3);
            }
            if (player.techniqueFxUntil > performance.now()) {
                const techniqueColor = techniqueColors[character.type] || accent;
                ctx.strokeStyle = techniqueColor;
                ctx.lineWidth = 3;
                ctx.shadowColor = techniqueColor;
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.ellipse(0, -26, 15 + Math.sin(time * 18) * 2, 24, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        }

        drawControlledIndicators(time) {
            const ctx = this.ctx;
            this.players.filter(player => player.isControlled
                || (this.ball && this.ball.owner === player && player.goalkeeper && player.team === 0)).forEach(player => {
                const scale = 0.92 + Math.max(0, Math.min(1, (player.y - 100) / 380)) * 0.3;
                const arrowY = player.y - (player.jump || 0) - 52 * scale;
                ctx.save();
                ctx.translate(player.x, arrowY - Math.sin(time * 5) * 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-10, -12);
                ctx.lineTo(-4, -12);
                ctx.lineTo(-4, -28);
                ctx.lineTo(4, -28);
                ctx.lineTo(4, -12);
                ctx.lineTo(10, -12);
                ctx.closePath();
                ctx.shadowColor = "#ffe675";
                ctx.shadowBlur = 16;
                ctx.fillStyle = "#ffe675";
                ctx.fill();
                ctx.strokeStyle = "#101820";
                ctx.lineWidth = 6;
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#fff9d5";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            });
        }

        drawPassTargetIndicator(time) {
            const receiver = this.ball && this.ball.passTarget;
            if (!receiver) return;
            const ctx = this.ctx;
            const pulse = 1 + Math.sin(time * 8) * 0.12;
            ctx.save();
            ctx.strokeStyle = "#75f4cf";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#75f4cf";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(receiver.x, receiver.y - 61, 13 * pulse, 5 * pulse, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#d5fff1";
            ctx.font = "bold 11px Rajdhani, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("PASE", receiver.x, receiver.y - 72);
            ctx.restore();
        }

        drawBall(ball) {
            const ctx = this.ctx;
            const groundY = ball.y;
            const height = ball.z || 0;
            ctx.fillStyle = `rgba(3,8,5,${Math.max(.12, .32 - height / 310)})`;
            ctx.beginPath();
            ctx.ellipse(ball.x, groundY + 2, Math.max(3, 7 - height / 35), Math.max(2, 3 - height / 60), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            ctx.translate(ball.x, groundY - height);
            ctx.scale(1, this.spriteYCompensation);
            if (ball.specialType && ball.techniqueFxUntil > performance.now()) {
                ctx.fillStyle = techniqueColors[ball.specialType] || "#fff";
                ctx.globalAlpha = 0.55;
                ctx.beginPath();
                ctx.arc(0, 0, 12 + Math.sin(performance.now() * 0.025) * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            ctx.rotate(ball.spin || 0);
            ctx.fillStyle = "#f6f1d8";
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#48504c";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-4, -2); ctx.lineTo(1, -4); ctx.lineTo(4, 0); ctx.lineTo(1, 4); ctx.lineTo(-4, 2); ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        drawChargeOverlay() {
            if (!this.chargeStartedAt || !this.ball || !this.ball.owner) return;
            const amount = Math.min(1, (performance.now() - this.chargeStartedAt) / 1450);
            const ctx = this.ctx;
            ctx.fillStyle = `rgba(8, 10, 18, ${amount * .48})`;
            ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
            const centerX = this.screenWidth / 2;
            const y = this.screenHeight - 70;
            ctx.fillStyle = "#111a20e8";
            ctx.fillRect(centerX - 165, y - 14, 330, 38);
            ctx.fillStyle = "#f2c66e";
            ctx.fillRect(centerX - 115, y - 7, 70, 24);
            ctx.fillStyle = "#64eac6";
            ctx.fillRect(centerX - 45, y - 7, 42, 24);
            ctx.fillStyle = "#263539";
            ctx.fillRect(centerX - 3, y - 7, 115, 24);
            const marker = centerX - 115 + ((performance.now() - this.chargeStartedAt) / 3.2 % 226);
            ctx.fillStyle = "#fff";
            ctx.fillRect(marker, y - 14, 4, 38);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px Rajdhani, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("¡SUELTA K EN LA ZONA TURQUESA!", centerX, y - 20);
        }

        drawTechniqueFx(time) {
            if (this.chargeStartedAt && this.ball && this.ball.owner) this.drawChargeOverlay();
            if (this.state === "playing" && this.ball && this.ball.z > 36) {
                const nearby = this.players.find(player => !player.goalkeeper && player.team !== (this.ball.lastTouch ? this.ball.lastTouch.team : 0) && this.distanceToBall(player) < 95);
                if (nearby) {
                    this.ctx.fillStyle = "#fff1a8";
                    this.ctx.font = "bold 28px Rajdhani, sans-serif";
                    this.ctx.textAlign = "center";
                    this.ctx.fillText("?", nearby.x, nearby.y - 65 - Math.sin(time * 7) * 3);
                }
            }
        }

        render(time) {
            if (this.state === "menu" || this.state === "selecting" || this.state === "finished") {
                this.drawMenuPitch();
                return;
            }
            const ctx = this.ctx;
            ctx.save();
            this.drawPitch();
            this.drawGoal(ctx, 100, 500, 1);
            this.drawGoal(ctx, 900, 500, -1);
            this.players.sort((a, b) => a.y - b.y).forEach(player => {
                if (this.state !== "goal" || player.team !== this.goalTeam) {
                    this.drawPlayer(player, time);
                    return;
                }
                const lane = this.players.filter(teammate => teammate.team === player.team && !teammate.goalkeeper).indexOf(player);
                const elapsed = Math.max(0, time - this.goalStartedAt / 1000);
                const targetX = this.goalTeam === 0 ? 395 + lane * 39 : 605 - lane * 39;
                const targetY = 230 + lane * 27;
                const approach = Math.min(1, elapsed * 2);
                const pose = { ...player, lane, x: player.x + (targetX - player.x) * approach, y: player.y + (targetY - player.y) * approach };
                if (this.celebration === 1) pose.jump = 28 + Math.abs(Math.sin(time * 8 + lane * 0.4)) * 20;
                else if (this.celebration === 2) {
                    pose.x += Math.sin(time * 9 + lane) * 5;
                    pose.y += Math.cos(time * 9 + lane) * 4;
                } else if (this.celebration === 4) {
                    pose.x += (this.goalTeam === 0 ? 1 : -1) * Math.min(34, elapsed * 24);
                    pose.jump = 5 + Math.abs(Math.sin(time * 7 + lane)) * 3;
                }
                this.drawPlayer(pose, time);
            });
            if (this.ball) this.drawBall(this.ball);
            this.drawPassTargetIndicator(time);
            this.drawControlledIndicators(time);
            this.drawTechniqueFx(time);
            ctx.restore();
        }

        frame(timestamp) {
            const delta = Math.min(0.035, (timestamp - (this.lastFrame || timestamp)) / 1000);
            this.lastFrame = timestamp;
            this.update(delta);
            this.render(timestamp / 1000);
            requestAnimationFrame(this.frame);
        }
    }

    new FootballGame();
})();
