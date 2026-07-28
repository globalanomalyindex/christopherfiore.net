/**
 * About. Written by Christopher and edited only for the house voice: lowercase
 * prose, American spelling, no em-dashes, proper nouns left capitalized.
 *
 * TWO CLAIM CLASSES LIVE HERE AND NEITHER MAY BE STRENGTHENED.
 *
 * The credentials are checkable facts about a real person, and several are
 * narrower than their nearest paraphrase: "co-star" is a specific screen credit
 * and is not "starred"; the Capstone paper was "recommended for and submitted
 * to" the Regeneron Science Talent Search, which is not placing in it; the
 * Strasberg courses were "accepted into", not completed-with-honors. Keep every
 * one of these exactly as narrow as it is written.
 *
 * The health disclosure in `advocacy` is his own, published deliberately as
 * part of the advocacy it describes. It is not a hook to hang product claims
 * on: adhd mode is credited to that experience, not validated by it.
 *
 * The practice section's last line ("built, tested, simulated, or concept") is
 * the same evidence vocabulary `data/cases.ts` gates every case row with. If
 * that vocabulary ever changes, this sentence changes with it.
 */

export interface AboutSection {
  id: string;
  /** printed in the "you are here" bar and the section index */
  name: string;
  paras: string[];
}

export const ABOUT = {
  /**
   * The page-04 standfirst, and the opening of the subpage. This is the thesis:
   * the claim is about the *process* producing early failure knowledge, which
   * is why the triplet lands on knowing where the work breaks rather than on
   * the work being finished or correct.
   */
  lede:
    "my name is christopher robin fiore. i'm a product designer, and my ideas don't stay ideas. " +
    'they get prototyped, tested, and scrutinized fast, with help from agentic AI workflows i deploy ' +
    'and manage myself. that puts research, stress tests, and counterarguments in front of me while ' +
    'the design can still change. what reaches you is not a pretty idea. it’s a working system with ' +
    'a usable prototype, a hypothesis an AI agent swarm attacked from every angle, a design that ' +
    'already knows where it breaks.',
  /** Printed under the subpage title. */
  descriptor: 'product designer · new york city',
} as const;

/**
 * The scannable column beside the prose. Every line here is a compression of
 * something the sections state in full, and it repeats them on purpose: a
 * reader deciding whether to hire someone skims the credentials before reading
 * the voice. Nothing may appear here that the prose does not also support.
 */
export const AT_A_GLANCE: { field: string; value: string }[] = [
  {
    field: 'education',
    value: 'Diploma in Concept Art, CG Spectrum College of Digital Art and Animation',
  },
  {
    field: 'mentorship',
    value: 'graphic design and Photoshop under Stephen Fiore, Senior Graphic Designer at Disney',
  },
  {
    field: 'research',
    value:
      'college-level Capstone and Research, 2017 to 2019. paper submitted to the Regeneron Science Talent Search',
  },
  {
    field: 'training',
    value: 'Lee Strasberg Theatre and Film Institute, two years, Advanced Method',
  },
  {
    field: 'screen',
    value:
      "co-star, Marvel Studios' Daredevil: Born Again (2025). campaign lead, New York Blood Center",
  },
  { field: 'design tools', value: 'Figma, Photoshop, Blender, Substance Sampler' },
  {
    field: 'AI tools',
    value: 'Claude Code, Claude Design, Codex, and agentic workflows i run myself',
  },
];

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: 'practice',
    name: 'practice',
    paras: [
      'the loop is short on purpose. an idea gets built far enough to actually use, then attacked: ' +
        'agent swarms running research, edge cases, and counterarguments in parallel, on a timescale ' +
        'where the answers still change the design.',
      'most of what comes back is unglamorous and early, which is exactly when it is worth having. ' +
        'what survives ships with its evidence attached and labeled for what it is, whether that is ' +
        'built, tested, simulated, or concept.',
    ],
  },
  {
    id: 'craft',
    name: 'design and craft',
    paras: [
      'i studied Concept Art and Illustration at CG Spectrum College of Digital Art and Animation, ' +
        'and finished with a Diploma in Concept Art. i was personally mentored in graphic design and ' +
        'Photoshop by Stephen Fiore, Senior Graphic Designer at Disney.',
      'the training is 2D first: drawing, sketching, thumbnailing, and photobashing. it carries into ' +
        '3D through Blender, texturing in Substance Sampler, and 3D paintovers. Figma is where the ' +
        'product work lands.',
    ],
  },
  {
    id: 'ai',
    name: 'AI practice',
    paras: [
      'i have been studying and using GPT since GPT-2 in 2019, which is long enough to have watched ' +
        'the tooling change shape several times over.',
      'in practice that means Claude Code on both CLI and desktop, Claude Design, and Codex, plus ' +
        'agentic workflows i build and run myself: Ultracode in Claude Code, subagents in ChatGPT Work.',
      'i deploy and manage these rather than consume them as a service. that is the difference ' +
        'between a tools list and actual leverage.',
    ],
  },
  {
    id: 'research',
    name: 'research',
    paras: [
      'i studied college-level Capstone and Research from 2017 to 2019 and ran a months-long study ' +
        "on the effects of predatory food labeling on adolescents' nutritional choices and awareness, " +
        'including real human surveying. the full paper was recommended for and submitted to the ' +
        'Regeneron Science Talent Search.',
      'chellbook, on the product design channel, is a label-reading product. that is not a ' +
        'coincidence. what a label is really telling you, and who it quietly fails, is a question i ' +
        'have been working on since 2017.',
    ],
  },
  {
    id: 'performance',
    name: 'performance',
    paras: [
      'i studied for two years at the Lee Strasberg Theatre and Film Institute in New York City, ' +
        "appeared in multiple school productions, and was accepted into the school's Advanced Method " +
        'courses. i was invited to private workshops there, including one hosted by Vincent ' +
        "d'Onofrio.",
      "i was a co-star in Marvel Studios' Daredevil: Born Again (2025) and the lead in a New York " +
        'Blood Center campaign that ran across network TV, social media, and streaming to tens of ' +
        'millions of views.',
      'the Method training is not a hobby sitting next to the design work. it is where i learned to ' +
        'research a person until their behavior makes sense from the inside, which is the same thing ' +
        'good user research asks for.',
    ],
  },
  {
    id: 'advocacy',
    name: 'advocacy',
    paras: [
      "i'm diagnosed with ADHD Type C and Cognitive Disengagement Syndrome.",
      'i advocate in my personal life for mental health treatment: helping people find providers, ' +
        'assembling the research and documentation that mental health insurance claims actually ' +
        'demand, and setting up AI tools that take executive-function load off the people carrying it.',
      'adhd mode, on the product design channel, comes directly from that.',
    ],
  },
];
