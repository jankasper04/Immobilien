// config.js: project settings.
//   duration: the video's length in seconds.
//   bpm:      the rhythm that bounces, dances and pulse() follow. Clawd always moves to some beat; if the video has music,
//             set this to the song's tempo, and set offset to the time in seconds of its first downbeat.
//   width, height: the frame in pixels. 1080×1920 is 9:16 for Reels, TikTok and Shorts; 1920×1080 is the kit's 16:9.
// Several videos live side by side in src/scenes/. Pick one with studio.html?scene=<name> (render.mjs --scene=<name>);
// without it, SCENE below is used. Each entry holds that video's settings.
const SCENE = 'falle15';
const SCENES = {
  theseus: { duration: 58, bpm: 100 },   // Das Schiff des Theseus (STORYBOARD_theseus.md)
  falle15: { duration: 58, bpm: 104 },   // Die 15 Prozent Falle nach dem Kauf (STORYBOARD_falle15.md)
};
const SCENE_NAME = new URLSearchParams(location.search).get('scene') || SCENE;
const PROJECT = { offset: 0, width: 1080, height: 1920, ...SCENES[SCENE_NAME] };
