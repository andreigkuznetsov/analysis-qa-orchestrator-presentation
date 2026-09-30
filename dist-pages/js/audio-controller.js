(function () {
  "use strict";

  class PresentationAudioController {
    constructor({ manifest, onAdvance, onComplete, onSync, onTrackStart, onState, onError }) {
      this.manifest = manifest;
      this.onAdvance = onAdvance;
      this.onComplete = onComplete;
      this.onSync = onSync;
      this.onTrackStart = onTrackStart;
      this.onState = onState;
      this.onError = onError;
      this.screenId = null;
      this.screen = null;
      this.trackIndex = 0;
      this.audio = null;
      this.enabled = false;
      this.autoplay = false;
      this.muted = false;
      this.playing = false;
      this.transcriptOpen = false;
      this.playbackRate = 1;
      this.error = null;
      this.loadSessionState();
      this.emitState();
    }

    loadSessionState() {
      try {
        this.muted = sessionStorage.getItem("presentation-audio-muted") === "true";
        this.autoplay = sessionStorage.getItem("presentation-audio-autoplay") === "true";
        this.transcriptOpen = sessionStorage.getItem("presentation-transcript-open") === "true";
        const storedRate = Number(sessionStorage.getItem("presentation-audio-rate"));
        if ([0.8, 0.9, 1, 1.1, 1.2].includes(storedRate)) this.playbackRate = storedRate;
      } catch (_) { /* Session storage may be unavailable for local files. */ }
    }

    saveSessionState() {
      try {
        sessionStorage.setItem("presentation-audio-muted", String(this.muted));
        sessionStorage.setItem("presentation-audio-autoplay", String(this.autoplay));
        sessionStorage.setItem("presentation-transcript-open", String(this.transcriptOpen));
        sessionStorage.setItem("presentation-audio-rate", String(this.playbackRate));
      } catch (_) { /* State remains available for the current page lifetime. */ }
    }

    loadScreen(screenId) {
      this.stop();
      this.screenId = screenId;
      this.screen = this.manifest.screens[screenId] || null;
      this.trackIndex = 0;
      this.error = null;
      this.onSync(null);
      this.emitState();
    }

    createAudio() {
      const currentTrack = this.screen?.tracks[this.trackIndex];
      if (!currentTrack) return null;
      const audio = new Audio(currentTrack.audioSrc);
      audio.preload = "metadata";
      audio.muted = this.muted;
      audio.playbackRate = this.playbackRate;
      audio.addEventListener("play", () => {
        this.playing = true;
        this.onTrackStart?.(currentTrack, this.screenId);
        this.emitState();
      });
      audio.addEventListener("pause", () => { this.playing = false; this.emitState(); });
      audio.addEventListener("ended", () => this.handleEnded());
      audio.addEventListener("error", () => this.handleError("Аудио для этого экрана пока недоступно."));
      this.audio = audio;
      this.onSync(currentTrack.syncKey);
      return audio;
    }

    async play() {
      this.enabled = true;
      this.error = null;
      if (!this.screen?.tracks.length) return this.handleError("Для этого экрана нет аудиодорожки.");
      if (!this.audio) this.createAudio();
      else this.onSync(this.screen.tracks[this.trackIndex]?.syncKey ?? null);
      try {
        await this.audio.play();
      } catch (_) {
        this.handleError("Не удалось воспроизвести аудио. Презентация доступна в ручном режиме.");
      }
    }

    pause() {
      this.audio?.pause();
    }

    togglePlay() {
      if (this.playing) this.pause();
      else this.play();
    }

    replay() {
      this.stop();
      this.trackIndex = 0;
      this.error = null;
      this.play();
    }

    stop() {
      if (this.audio) {
        this.audio.pause();
        this.audio.removeAttribute("src");
        this.audio.load();
      }
      this.audio = null;
      this.playing = false;
      this.trackIndex = 0;
      this.onSync?.(null);
      this.emitState();
    }

    async handleEnded() {
      this.audio = null;
      this.playing = false;
      this.trackIndex += 1;
      if (this.trackIndex < this.screen.tracks.length) {
        this.createAudio();
        await this.play();
        return;
      }
      this.trackIndex = 0;
      this.onSync(null);
      this.emitState();
      const shouldAdvance = this.onComplete?.(this.screenId) !== false;
      if (shouldAdvance && this.autoplay && this.screen.autoplayEligible) this.onAdvance();
    }

    handleError(message) {
      this.error = message;
      this.playing = false;
      this.autoplay = false;
      if (this.audio) this.audio.pause();
      this.onError(message);
      this.saveSessionState();
      this.emitState();
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.audio) this.audio.muted = muted;
      this.saveSessionState();
      this.emitState();
    }

    setAutoplay(autoplay) {
      this.autoplay = autoplay;
      this.saveSessionState();
      this.emitState();
    }

    setTranscriptOpen(open) {
      this.transcriptOpen = open;
      this.saveSessionState();
      this.emitState();
    }

    setPlaybackRate(rate) {
      const nextRate = Number(rate);
      if (![0.8, 0.9, 1, 1.1, 1.2].includes(nextRate)) return;
      this.playbackRate = nextRate;
      if (this.audio) this.audio.playbackRate = nextRate;
      this.saveSessionState();
      this.emitState();
    }

    emitState() {
      this.onState?.({
        enabled: this.enabled,
        playing: this.playing,
        muted: this.muted,
        autoplay: this.autoplay,
        mode: this.autoplay ? "auto" : "manual",
        playback: this.playing ? "playing" : this.audio ? "paused" : "stopped",
        transcriptOpen: this.transcriptOpen,
        playbackRate: this.playbackRate,
        available: Boolean(this.screen?.tracks.length),
        error: this.error,
        screenId: this.screenId,
        trackIndex: this.trackIndex
      });
    }
  }

  window.PresentationAudioController = PresentationAudioController;
}());
