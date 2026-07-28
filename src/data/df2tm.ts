/**
 * df2tm — a shipped Claude Code plugin.
 *
 * Every string here is transcribed from the repository's own README at
 * github.com/globalanomalyindex/df2tm, lowercased into the house voice but not
 * restated. Three of its claims are the product's own and must not be
 * inflated or softened:
 *
 *   - "nothing is sent anywhere" is a privacy claim about where state lives.
 *     It is true because the plugin writes only to `~/.claude/df2tm/`. Do not
 *     generalize it into a claim about Claude Code as a whole.
 *   - "~170 learning-science principles" is the README's own number, and the
 *     README points at the file that lists them. Keep the tilde.
 *   - The relevance gate is what makes this teach *less*, not more. Wording
 *     that sells it as "always teaching" describes a different product.
 *
 * The steering phrases and command names are an interface contract: they are
 * what a user actually types. They are copied exactly, never paraphrased.
 */

export interface Df2tmSection {
  id: string;
  name: string;
  paras: string[];
}

export const DF2TM = {
  name: 'df2tm',
  expansion: "don't forget to teach me",
  descriptor: 'an always-on learning layer for Claude Code',
  state: 'shipped · claude code plugin',
  repo: 'https://github.com/globalanomalyindex/df2tm',
  repoLabel: 'github.com/globalanomalyindex/df2tm',
  /** The README's own framing, and the reason the plugin exists. */
  standfirst:
    'claude code does great work. df2tm makes sure you learn from it. as claude works on your ' +
    'real projects, it teaches the concepts behind what it is doing and remembers what you have ' +
    'learned across sessions, so you keep claude at full speed and grow your own understanding ' +
    'at the same time.',
  question:
    'my answer to the question a lot of young people like myself have about AI: how do we make it ' +
    'help us improve, instead of just replacing our work?',
} as const;

export const DF2TM_SECTIONS: Df2tmSection[] = [
  {
    id: 'behaviour',
    name: 'what it does',
    paras: [
      'it teaches while claude works. when a load-bearing concept shows up in your task, df2tm ' +
        'drops a short, skimmable aside explaining it, and then gets out of the way.',
      'it remembers across sessions. concepts worth keeping go into a local learner model with ' +
        'spaced-repetition review dates, and next time they come up it checks what stuck.',
      'it makes you a better director. beyond the code itself it teaches you to steer claude with ' +
        'sharper prompts: when to delegate, when to learn, when to ask for the reasoning.',
    ],
  },
  {
    id: 'gate',
    name: 'the relevance gate',
    paras: [
      'the hard part of a teaching layer is not teaching. it is silence.',
      'every potential teaching moment passes a four-part gate before anything appears: ' +
        'load-bearing, forward-useful, novel-enough, and budget allows. pass it and you get an ' +
        'aside, skimmable at zero cost to the work. fail it, or say you are firefighting, and ' +
        'df2tm says nothing at all.',
      'that gate is the product. an assistant that explains everything is one you turn off in a ' +
        'week.',
    ],
  },
  {
    id: 'memory',
    name: 'memory',
    paras: [
      'a session-start hook runs at the beginning of every session. it reads your learner model, ' +
        'surfaces the concepts due for review, and quietly activates.',
      'concepts are recorded with a grasp level, new to shaky to solid, and a spaced-repetition ' +
        'due date, so later sessions reinforce what matters in that project or globally rather ' +
        'than repeating what already landed.',
    ],
  },
  {
    id: 'steering',
    name: 'steering',
    paras: [
      'the controls are plain language, not syntax. "teach me more" and "teach me less" move the ' +
        'intensity. "just do it" goes silent and stays silent. "why did you do that" explains the ' +
        'last decision, "quiz me" runs active recall on what is due, "debrief" recaps the session, ' +
        'and "i already know this" retires a concept for good.',
      'there are slash commands under /df2tm: for the same things, but nothing requires them.',
      'it also auto-calibrates. engage and it teaches a little more, ignore it and it backs off. ' +
        'the changes are always explained, never silent.',
    ],
  },
  {
    id: 'science',
    name: 'the science',
    paras: [
      'the teaching draws on about 170 learning-science principles: evidence-based techniques ' +
        'such as spaced repetition, active recall, dual coding and elaborative interrogation, the ' +
        'cognitive effects that justify them, and the mechanisms underneath.',
      'they are applied dynamically, based on you and on the work, never all at once. the ' +
        'repository lists the full library.',
    ],
  },
  {
    id: 'privacy',
    name: 'state and privacy',
    paras: [
      'everything is local on your machine. nothing is sent anywhere.',
      'two files hold it all: a learner model with your preferences and one line per tracked ' +
        'concept, and a dated journal of what you have been taught, per project. the state ' +
        'directory can be relocated to a synced folder, and deleting it resets the history ' +
        'completely, re-seeding on the next session.',
    ],
  },
];

/** The scannable column: what someone evaluating the plugin wants up front. */
export const DF2TM_GLANCE: { field: string; value: string }[] = [
  { field: 'install', value: '/plugin marketplace add globalanomalyindex/df2tm' },
  { field: 'then', value: '/plugin install df2tm@df2tm' },
  {
    field: 'intensities',
    value: 'silent · ambient (default) · active · socratic',
  },
  { field: 'state', value: '~/.claude/df2tm, local only, relocatable' },
  { field: 'requirements', value: 'claude code on macOS or Linux. windows hook support is planned' },
  { field: 'built with', value: 'shell, a session-start hook, and skill definitions' },
  { field: 'license', value: 'MIT' },
];
