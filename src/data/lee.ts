/**
 * lee — a self-tape recording interface for macOS.
 *
 * Transcribed from `DESIGN_RATIONALE.md`, `README.md` and `IMPLEMENTATION.md`
 * in the handoff package, edited into the house voice but not restated.
 *
 * FOUR CLAIM BOUNDARIES, ALL LOAD-BEARING.
 *
 * 1. NOTHING HERE WAS BUILT, AND NOBODY COMMISSIONED IT. There is no macOS
 *    app. `state` says "self-directed concept · macOS · nothing was built and
 *    nobody commissioned it" and that phrasing is the boundary, not decoration.
 *
 * 2. THE PROTOTYPE IS HTML STANDING IN FOR A MAC APP. The handoff calls it a
 *    design reference and says in as many words that it is not production code.
 *    It is hosted here because it is the fastest way to read the design, not
 *    because it is the product. Never call it the app.
 *
 * 3. THE CAMERA FEED AND THE IMAGE SLOTS ARE PLACEHOLDERS. Every frame in the
 *    renders is a striped fill labelled `camera feed`, the reader has no voice
 *    behind it, and the note canvas's image slots are empty until someone drops
 *    a file in. The renders are design renders, never product screenshots.
 *
 * 4. LEE IS A PROGRAM, NOT A CHARACTER. This is the handoff's own product rule
 *    and it binds this file too: nothing here gives it a voice, a personality
 *    or an opinion. "lee does not detect gaze" is fine, because that is a
 *    program not doing something. "lee suggests" is not.
 *
 * The sample project name and the scene text inside the prototype are demo
 * data the author wrote to have something on the page. Nothing in this file
 * repeats them, and nothing here claims a relationship to any film.
 */

export interface LeeSection {
  id: string;
  name: string;
  paras: string[];
  /**
   * Which plate view this section is arguing over, by `LEE_VIEWS` index.
   * Reading the column moves the plate to it; touching the plate never moves
   * the column. A section with no honest match leaves the plate alone, which
   * is why this is optional rather than defaulted.
   */
  view?: number;
}

export const LEE = {
  /** The big letter-split title on the subpage, and the row name. */
  name: 'lee',
  /** What the screen calls itself to assistive tech and on a phone. */
  title: 'a self-tape recording interface for macOS',
  descriptor: 'an actor marks the script in color, then never reads a note while the camera rolls',
  state: 'self-directed concept · macOS · nothing was built and nobody commissioned it',
  role: 'product design: structure, interaction, visual, prototype, engineering handoff',
  surface: 'macOS desktop program, 1440 by 900',
  /** The interactive prototype, hosted alongside this site. */
  demoHref: 'lee/studio.html',
  demoLabel: 'open the interactive prototype',
  /** The low fidelity exploration, hosted beside it. */
  wireHref: 'lee/wireframes.html',
  standfirst:
    'an actor recording a self-tape has to read the script, look near the lens, light the room, ' +
    'run the camera and act, all at once, on a laptop. lee is a macOS program for that. you drop ' +
    'in a script, mark it up in color, then record against a teleprompter sitting right under the ' +
    'lens with a voice reading the other parts. the idea it all turns on is that preparation ' +
    'becomes color. a note that says "she already knows the answer" is useless while you are ' +
    'rolling, because reading it means stopping the performance to parse a sentence. so you color ' +
    'the phrase instead, and on the take you see the color and your own thinking comes back. none ' +
    'of this was built. it is a concept, the prototype is html standing in for a mac app, and ' +
    'every camera feed you see is a placeholder.',
} as const;

/**
 * The plate the standfirst opens on: the script, which is where the work
 * starts and where the mechanism the whole product runs on is applied.
 *
 * Scroll section 0, not a member of LEE_SECTIONS, so it carries its own value.
 */
export const LEE_LEAD_VIEW = 0;

export const LEE_SECTIONS: LeeSection[] = [
  {
    id: 'rule',
    view: 0,
    name: 'what it is, and what it will not do',
    paras: [
      'lee is a program. it is not a character, not an assistant and not a voice. nothing in the ' +
        'interface speaks as lee, there is no chat, and the one place it makes a sound at all is ' +
        'the reader that voices the other parts, which is labeled Reader.',
      'that is a product rule rather than a copy rule. an actor’s attention during a take is ' +
        'the whole product. anything that greets you, congratulates you or explains itself is ' +
        'competing with the scene. a tool that gets out of the way is worth more than one that ' +
        'charms.',
      'four things carry it, in this order: recording, the lines, color coding, notes. everything ' +
        'else supports those. import is a drop target rather than a screen. export is one panel. ' +
        'the library is the home page and nothing more.',
    ],
  },
  {
    id: 'flow',
    view: 0,
    name: 'nine stages, cut to four',
    paras: [
      'the flow is script, notes, record, takes. it started at nine: import, script review, ' +
        'character setup, framing check, recording, take review, export, library, settings.',
      'six of those nine were not places. they were moments. a screen whose only job is to accept ' +
        'a file is a screen you visit once, so import became a drop target on the home page. ' +
        'character setup became a sheet that slides in over the script, because setup that sits ' +
        'next to the thing being set up gets used, and setup in its own step gets skipped.',
      'the framing check is the one i went back and forth on longest. you cannot judge headroom ' +
        'or eyeline height in a separate screen with a small preview. you judge them in the frame ' +
        'you are about to send, with the real controls under it. a separate step also implies you ' +
        'are done with it, and framing gets adjusted between takes.',
      'what is left is what an actor actually does. read the script and mark it, prepare, record, ' +
        'pick a take. four steps you genuinely stop and do.',
    ],
  },
  {
    id: 'script',
    view: 0,
    name: 'a screenplay, not a data view',
    paras: [
      'the script page is drawn in standard screenplay format. sluglines in caps, action across ' +
        'the full width, character names indented and centered over the dialogue, dialogue in a ' +
        'narrow column, all in Monaco on a white page over a gray desk.',
      'an earlier version rendered it as a list of speaker rows with colored dots, which is how ' +
        'software wants to show dialogue and not how a script looks. an actor has read hundreds ' +
        'of pages in this exact format. matching it means there is no translation step, and the ' +
        'marks land where their eye already goes.',
      'marking is per phrase and not per line, because intentions change mid line. select some ' +
        'words, pick a color, and that phrase stays that color in the teleprompter while you ' +
        'perform. the actor names the colors. the defaults are push, hold back and warmer, and ' +
        'lee never interprets what any of them mean.',
      'characters carry colors from the same palette, but character color only appears on the ' +
        'name. it is never a highlight on dialogue. two color systems on one page would collide, ' +
        'so splitting them by role keeps both readable. the dots also came out of the script ' +
        'body, because a dot inside a screenplay page reads as software and a highlight reads as ' +
        'a pencil.',
      'two characters holding the same color would break all of that quietly. in the character ' +
        'sheet, any color another character already owns shows that character’s initial in a ' +
        'white pill and cannot be picked. the collision is visible before it happens instead of ' +
        'diagnosed after.',
    ],
  },
  {
    id: 'notes',
    view: 1,
    name: 'a canvas, not a text field',
    paras: [
      'preparation is not typing. actors bring images, associations and marginalia. so the notes ' +
        'page is a working surface: a canvas beside the script where you drag note frames around, ' +
        'drop images in, write in them, draw on the script itself, and tie any note to a phrase.',
      'the tie is the part that matters. a note is not filed by date or by topic. it is attached ' +
        'to the words that set it off. the tie shows in the note header and the note’s left ' +
        'edge carries the tie color as a stripe, so when you mark that phrase later, every note ' +
        'tied to it takes the same color. the preparation and the cue you get while rolling end ' +
        'up being the same object.',
      'two small rules keep the canvas calm. double click a note’s body to edit its text and ' +
        'double click its header to change what it is tied to, which is one gesture on two ' +
        'targets with no modes. and the color sits on the left edge as a stripe rather than a dot ' +
        'in the top left corner, because a circle in the top left of a card reads as a mac window ' +
        'control.',
    ],
  },
  {
    id: 'prompter',
    view: 2,
    name: 'the lines go under the lens',
    paras: [
      'the lines sit at the very top of the frame, right under the camera. reading pulls your ' +
        'eyes toward the lens instead of down, which is the difference between a take that looks ' +
        'like an audition and one that looks like someone reading. they are centered so your eye ' +
        'returns to the same spot every time rather than tracking left on each new line.',
      'the treatment is the actor’s call, because it depends on the room and the take. ' +
        'surface is a solid bar or clear text floating over the frame. depth is off, one, two or ' +
        'three lines ahead. auto advance is on or off, with manual arrows either way. i drew four ' +
        'fixed layouts first and then cut them, because they only differed in those two ' +
        'variables, and shipping them as presets would have been four names for two sliders.',
      'the eyeline is a line the actor drags to wherever they want to look, and only they can see ' +
        'it. lee does not detect gaze, does not analyze the frame and does not score eye contact. ' +
        'early versions had a dot telling you where to look and a readout explaining the angle. ' +
        'both came out. where an actor looks is an interpretive choice about who they are talking ' +
        'to. a tool that assigns it takes the choice away, and a tool that grades it makes the ' +
        'actor perform for the software. the label is one word, Eyeline, because the earlier ' +
        '"EYES ON THIS LINE" was an instruction rather than a label.',
      'lookaway points are the same idea in a scene with several characters. you pin a marker ' +
        'anywhere in the frame per character, and when that character speaks, their line appears ' +
        'at their pin in their color instead of in the bar. the scene gets positions in space and ' +
        'you can look between them. your own lines always stay at the lens, because that is where ' +
        'the performance goes. you place the pins and you delete them.',
    ],
  },
  {
    id: 'light',
    view: 3,
    name: 'the display is the light',
    paras: [
      'macOS can turn the screen into a light source, so lee frames the camera feed with an ' +
        'emissive border. one slider drives thickness and brightness, another drives color from ' +
        'cool to warm. it is built in layers so it reads as light rather than as a colored ' +
        'border: a soft outer glow, an opaque core, a bright inner lip, and a wash over the whole ' +
        'window.',
      'the one thing that makes it usable is the hole. the light cuts a soft opening around the ' +
        'cursor so you can still see and work the interface behind it. without that, turning your ' +
        'display into a lamp makes the computer unusable while it is on.',
      'the bulb is an on and off switch rather than a panel trigger. click it and the light comes ' +
        'up with its sliders. click somewhere else and the sliders close while the light stays ' +
        'on. click the bulb again to turn it off. the bands only paint on the record screen, ' +
        'where you are actually being lit by them, and the wash carries everywhere else so the ' +
        'effect survives moving between screens.',
      'the countdown before a take shows the colors you marked the scene with as large circles, ' +
        'and a number. that is all. the circles expand and contract once a second while the ' +
        'number counts down, which is one breath per second. you are not being told that ' +
        'recording is about to start. you are being handed a rhythm to breathe with and your own ' +
        'color work to look at.',
    ],
  },
  {
    id: 'takes',
    view: 4,
    name: 'was that the one',
    paras: [
      'stopping a take lands you on takes with the new one already selected, because the question ' +
        'after a take is always whether that was the one. takes are listed with a duration and a ' +
        'star for keepers, over a player you can scrub.',
      'export is a panel on the same screen rather than a destination, because you export the ' +
        'take you just picked, and making it a place adds a navigation step to a decision you ' +
        'already made. there are format checkboxes, a checklist against casting conventions, and ' +
        'a file name generated to match them. one button turns into a progress bar and then names ' +
        'what it wrote.',
    ],
  },
  {
    id: 'rejected',
    view: 5,
    name: 'the list of things that get proposed again',
    paras: [
      'the wireframes are three rounds of options with the newest at the top, and every option ' +
        'kept its id, so a rejected one stays findable rather than disappearing.',
      'the rejection list is the part i would hand over first, because every item on it gets ' +
        'proposed again: personifying lee, automatic eyeline detection and gaze scoring, telling ' +
        'the actor their background is busy, reading notes during a take, nine top level stages, ' +
        'four teleprompter presets, colored dots inside the screenplay body, circles in the top ' +
        'left of a card, rows of buttons for one choice, and all caps interface copy, which is ' +
        'reserved for character names because that is screenplay convention.',
      'each one has its reason written next to it. a rejection with no reason attached gets ' +
        'reversed by the next person who has the idea.',
    ],
  },
  {
    /*
      No `view`. The open questions do not argue over a screen, and sending the
      plate back to an earlier view here is exactly the backwards jump the walk
      order exists to prevent.
    */
    id: 'open',
    name: 'what is still open',
    paras: [
      'four things i would decide with real actors rather than on my own. whether marks should ' +
        'carry between projects or stay with one script. whether the reader should handle ' +
        'interruption and overlap, which is how scenes actually run. whether lookaway pins belong ' +
        'to a scene or to a project. and whether takes need a comparison view rather than a list, ' +
        'because a list stops working somewhere around fifteen of them.',
      'and the boundaries on everything above. none of this was built. the prototype is html ' +
        'standing in for a mac app, so every camera feed is a striped placeholder, the reader has ' +
        'no voice behind it, and the image slots on the notes canvas stay empty until you drop ' +
        'something in. the structure, the hierarchy, the copy and the interaction model are the ' +
        'deliverable.',
    ],
  },
];

/**
 * The scannable column: what the work was and what it produced.
 *
 * SEVEN ROWS IS THE CEILING, the same measured limit the chipotle screen
 * carries: the column runs from `glanceRowsY` to the band end, and these
 * values wrap to two and three lines at this width. Adding a row means
 * shortening two others.
 */
export const LEE_GLANCE: { field: string; value: string }[] = [
  { field: 'client', value: 'none. self-directed, and nothing was built' },
  { field: 'surface', value: 'a macOS desktop program, 1440 by 900' },
  { field: 'the product', value: 'four steps: script, notes, record, takes' },
  {
    field: 'the mechanism',
    value: 'preparation turns into color, so nothing is read while rolling',
  },
  {
    field: 'the hard line',
    value: 'the actor places the eyeline. lee never detects it or grades it',
  },
  {
    field: 'delivered',
    value: 'an interactive prototype, a wireframe set, 20 renders, a build spec',
  },
  {
    field: 'the renders',
    value: 'design renders. every camera feed in them is a placeholder',
  },
];
