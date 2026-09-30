(function () {
  "use strict";

  const track = (id, audioSrc, duration, syncKey = null, metadata = {}) => ({ id, audioSrc, duration, syncKey, ...metadata });
  const screen = (id, tracks, autoplayEligible = true) => ({
    id,
    transcriptId: id,
    autoplayEligible,
    tracks: tracks.map(item => ({ ...item, transcriptId: id, autoplayEligible }))
  });

  const sortDemoDurations = [10.1368125, 9.428604166666666, 8.058625, 9.893, 19.854354166666667, 8.1050625, 5.713395833333333, 7.698708333333333, 12.772270833333334, 9.335708333333333, 18.638666666666666, 9.324104166666666, 7.629041666666667, 10.276125, 16.945291666666666, 11.123645833333333, 12.435583333333334, 5.817895833333333, 16.862333333333332, 12.783875, 8.673958333333333, 6.22425, 15.512229166666666, 11.402291666666667, 10.299354166666667, 11.6693125, 10.961104166666667, 19.171041666666667];
  const sortDemoTracks = window.SORT_1998_DEMO_TTS.cueTracks.map((cue, index) => track(
    cue.audioTrackId,
    cue.audioPath,
    sortDemoDurations[index],
    cue.id,
    { frame: cue.frame, order: cue.order, parentSegmentId: cue.parentSegmentId, ttsRef: cue.id, demoCue: true }
  ));

  window.PRESENTATION_AUDIO_MANIFEST = {
    version: "3B",
    screens: {
      "slide-01": screen("slide-01", [
        track("slide-01-title", "assets/audio/slide-01/title.ogg", 3.3914166666666667, "title", { speed: 1.15 }),
        track("slide-01-body", "assets/audio/slide-01/body.ogg", 24.768729166666667, "body", { speed: 1.25 })
      ]),
      "slide-02": screen("slide-02", [track("slide-02", "assets/audio/slide-02.ogg", 36.627563)]),
      "slide-03": screen("slide-03", [track("slide-03", "assets/audio/slide-03.ogg", 31.343333333333334)]),
      "slide-04": screen("slide-04", [
        track("slide-04-intro", "assets/audio/slide-04/intro-v2.ogg", 8.244375, "workflow-overview"),
        track("slide-04-section-01", "assets/audio/slide-04/section-01.ogg", 10.067145833333333, "section-documents"),
        track("slide-04-section-02", "assets/audio/slide-04/section-02.ogg", 8.546229166666667, "section-requirements"),
        track("slide-04-section-03", "assets/audio/slide-04/section-03.ogg", 21.834770833333334, "section-logic"),
        track("slide-04-section-04", "assets/audio/slide-04/section-04.ogg", 26.558354166666668, "section-remediation"),
        track("slide-04-section-05", "assets/audio/slide-04/section-05.ogg", 10.6128125, "section-coverage")
      ]),
      "slide-05": screen("slide-05", [
        track("slide-05-intro", "assets/audio/slide-05/intro.ogg", 11.889916666666666, "decision-neutral"),
        track("slide-05-requirement-accept", "assets/audio/slide-05/requirement-accept.ogg", 9.300895833333334, "requirement-accept"),
        track("slide-05-requirement-exclude", "assets/audio/slide-05/requirement-exclude.ogg", 6.189416666666666, "requirement-exclude"),
        track("slide-05-problem-exclude", "assets/audio/slide-05/problem-exclude.ogg", 8.047, "problem-exclude"),
        track("slide-05-problem-accept", "assets/audio/slide-05/problem-accept.ogg", 23.133395833333335, "problem-accept")
      ]),
      "slide-06": screen("slide-06", [
        track("slide-06-intro", "assets/audio/slide-06/intro.ogg", 5.8875625, "roles-intro"),
        track("slide-06-business", "assets/audio/slide-06/business-v2.ogg", 11.3906875, "business"),
        track("slide-06-sdm", "assets/audio/slide-06/sdm.ogg", 7.687104, "sdm"),
        track("slide-06-ba-sa", "assets/audio/slide-06/ba-sa-v2.ogg", 16.3614375, "ba-sa"),
        track("slide-06-developer", "assets/audio/slide-06/developer.ogg", 4.343417, "developer"),
        track("slide-06-qa", "assets/audio/slide-06/qa.ogg", 5.550854, "qa"),
        track("slide-06-support", "assets/audio/slide-06/support.ogg", 16.674896, "support")
      ]),
      "slide-07": screen("slide-07", [track("slide-07", "assets/audio/slide-07.ogg", 71.208771)]),
      "slide-08": screen("slide-08", [track("slide-08-intro", "assets/audio/slide-08-intro.ogg", 22.841479), ...sortDemoTracks]),
      "slide-09": screen("slide-09", [track("slide-09", "assets/audio/slide-09.ogg", 51.607771)]),
      "slide-10": screen("slide-10", [
        track("slide-10-origin", "assets/audio/slide-10/rules-origin-v2.ogg", 39.827416666666664, "rules-origin"),
        track("slide-10-approval", "assets/audio/slide-10/human-approval-v2.ogg", 25.35258333333333, "human-approval"),
        track("slide-10-application", "assets/audio/slide-10/rules-application.ogg", 24.329229, "rules-application"),
        track("slide-10-rules", "assets/audio/slide-10/rules-summary.ogg", 6.166188, "formulated-rules")
      ]),
      questions: screen("questions", [track("questions", "assets/audio/questions.ogg", 3.0315)]),
      tech: screen("tech", [track("tech", "assets/audio/tech.ogg", 23.363917)], false)
    }
  };
}());
