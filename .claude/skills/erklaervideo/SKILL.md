---
name: erklaervideo
description: Plant und animiert 9:16 Erklärvideos (ca. 60 Sekunden, für Reels, TikTok und Shorts), die eine philosophische Idee ohne Text erklären, als handgemalten Cartoon mit Clawd in p5.js und p5.brush. Starke Bilder, klare Schnitte, Kamerafahrten. Verwende diesen Skill immer, wenn der Nutzer ein Erklärvideo, Animationsvideo, Reel, Short oder TikTok zu einem philosophischen Gedanken, Gleichnis oder Denkexperiment will, Ideen oder ein Storyboard dafür braucht, oder das Animations-Kit in erklaervideo/ erwähnt.
---

# Erklärvideo

Das Kit liegt in `erklaervideo/` und basiert auf [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) (MIT). Wie animiert wird, steht in `erklaervideo/ANIMATION_GUIDE.md`. Lies den Guide vollständig, bevor du irgendetwas zeichnest. Dieser Skill legt fest, **was** die Videos sein sollen, der Guide legt fest, **wie** sie gebaut werden.

## Was die Videos sind

1. **Eine philosophische Idee, leicht erklärt.** Ein Gedanke pro Video. Schreib vorher eine Kernaussage auf, die ein Zuschauer nach dem Ansehen in einem Satz wiedergeben könnte. Jede Einstellung dient dieser Aussage.
2. **Kein Text im Bild.** Die Idee muss allein aus den Bildern verständlich sein, auch ohne Ton. Ein Voiceover kann später dazukommen, darf aber nie nötig sein.
3. **Starke Bilder.** Jede Einstellung hat ein Schlüsselbild, das als Standbild funktioniert: klare Silhouette, ein Blickpunkt, kräftiger Kontrast zwischen Figur und Hintergrund. Frag dich bei jedem Shot, ob er als Thumbnail taugen würde.
4. **Klare Schnitte.** Schnitt auf Aktion, Match Cut (gleiche Form oder Bewegung über den Schnitt) und Smash Cut sind das Grundvokabular. Keine weichen Überblendungen ohne Grund.
5. **Kamerafahrten.** Die Kamera ist nie tot. Jeder Shot hat eine bewusste Bewegung: Push In, Pull Back Reveal, Kranfahrt, Neigung, Whip Pan mit Smear.
6. **Hook in den ersten 2 Sekunden.** Das Video beginnt mitten in einer Handlung oder einem überraschenden Bild, nicht mit einer Einleitung.
7. **Schluss reimt auf den Anfang,** am besten so, dass das letzte Bild wieder in das erste führt. Reels laufen in Schleife.

## Hochformat 9:16

1. Das Format steht schon in `erklaervideo/src/config.js`: `width: 1080, height: 1920`. Setz `duration` auf die Länge des Videos (50 bis 60 s). Im Scene-Code immer `W` und `H` statt fester Zahlen wie 960 oder 1920.
2. **Denk vertikal.** Oben und unten tragen die Geschichte: Aufstieg und Fall, Tiefe und Himmel, Spiegelung im Wasser. Kranfahrten und Neigungen nach oben oder unten nutzen das Format am stärksten.
3. Die wichtigste Handlung gehört ins mittlere Drittel. Im unteren Fünftel liegen bei Reels und TikTok Beschreibung und Bedienelemente, rechts die Icons.
4. `src/scenes/demo.js` ist für 16:9 gemalt und sieht im Hochformat kaputt aus. Ersetze seinen Script Tag in `studio.html` durch deine eigene Szene.

## Ablauf

1. **Storyboard zuerst.** Schreib `erklaervideo/STORYBOARD.md` im Format aus dem Guide und ergänze oben die Zeile `Kernaussage:`. Zeig es dem Nutzer und warte auf ein OK, bevor du Code schreibst.
2. **Bauen** Shot für Shot in `src/scenes/<name>.js`, wie im Guide beschrieben.
3. **Prüfen** mit Contact Sheets, Strips und Crops (Review Loop im Guide). Schau die Bilder wirklich an.
4. **Rendern** und das MP4 dem Nutzer schicken.

## Rendern in der Cloud-Umgebung

```bash
cd erklaervideo
npm ci                                          # einmal pro neuer Session
which ffmpeg || apt-get install -y ffmpeg       # falls ffmpeg fehlt
R="node render.mjs --chrome=/opt/pw-browsers/chromium --soft-gl"
$R --sheet=1,5,10 --cols=3 --w=360 --out=out/check/sheet.jpg     # Contact Sheet
$R --frames --workers=4                                           # Frames, parallel und fortsetzbar
node render.mjs --encode --out=out/video.mp4                      # zu MP4
```

1. Hier gibt es keine GPU, deshalb `--soft-gl`. Einfache Frames brauchen etwa 0,2 s, Frames mit vielen Aquarellflächen (`fill`) bis zu 30 s. Ein 60 Sekunden Video hat 1440 Frames. Setz `fill` also sparsam ein (große Flächen wie Himmel), nimm sonst `wash`, und behalte das `ms/frame` in der Ausgabe im Blick.
2. Auf einem Rechner mit Grafikkarte geht es ohne `--soft-gl` und deutlich schneller.
3. Die Google Schrift „Permanent Marker“ lädt hier nicht (Zertifikat des Proxys). Das ist egal, solange kein Text im Bild ist.
