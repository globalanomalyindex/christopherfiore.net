/**
 * About + say hi. Every string is the designer's final copy from the prose
 * redesign handoff (CONTENT.md, "about + say hi"), character for character,
 * including where it uses a straight apostrophe and where a curly one.
 *
 * THE ORDER IS FINAL AND DELIBERATE. "at a glance" comes first because a
 * hiring reader skims credentials before reading the voice. There is no work
 * or experience section: it was removed by request, and those facts live in
 * the resume PDF.
 *
 * CLAIMS STAY EXACTLY AS NARROW AS WRITTEN. "co-star" is a specific screen
 * credit, not "starred". The paper was "recommended for and submitted to" the
 * Regeneron STS, which is not placing in it. "accepted into" the Advanced
 * Method courses. Strasberg is "two years", confirmed. Do not round any of it
 * up when editing.
 *
 * `**name**` marks bold. It is the only markup these strings carry.
 */

export interface GlanceRow {
  field: string;
  value: string;
  /** A document the row points at, rendered as a button after the value. */
  doc?: 'certificate';
}

export interface AboutSection {
  id: string;
  name: string;
  paras: string[];
}

export const ABOUT = {
  lede:
    "my name is christopher robin fiore. i'm a product designer, and my ideas don't stay ideas. " +
    'they get prototyped, tested, and scrutinized fast, with help from agentic AI workflows i ' +
    'deploy and manage myself. that puts research, stress tests, and counterarguments in front ' +
    'of me while the design can still change. what reaches you is not a pretty idea. it’s a ' +
    'working system with a usable prototype, a hypothesis an AI agent swarm attacked from every ' +
    'angle, a design that already knows where it breaks.',
  summary:
    'i take ambiguous problems to interaction architecture, build the hard behavior as a working ' +
    'prototype in React and TypeScript, then run the test that could prove it wrong. two ' +
    'published open-source plugins and preregistered blind studies with published methodology ' +
    'and data. hands-on with language models since GPT-2 in 2019.',
} as const;

export const GLANCE: GlanceRow[] = [
  {
    field: 'product design',
    value:
      'product strategy, UX/UI, interaction design, information architecture, user flows, ' +
      'wireframing, prototyping, design systems, state design, responsive design, motion, ' +
      'accessibility (WCAG).',
  },
  {
    field: 'design engineering',
    value: 'React, Next.js, TypeScript, JavaScript, Vite, Tailwind CSS, Motion, XState, Three.js.',
  },
  {
    field: 'research and evaluation',
    value:
      'experiment design, preregistration, blind grading, simulation, comparative evaluation, ' +
      'research synthesis, Vitest, Playwright, axe-core, GitHub Actions.',
  },
  {
    field: 'tools and AI',
    value:
      'Figma, Claude Design, Adobe Photoshop, Blender, Claude Code, Codex, plugin architecture, ' +
      'agentic workflow direction, AI-native interaction design.',
  },
  {
    field: 'education',
    value:
      'Diploma in Concept Art, CG Spectrum College of Digital Art and Animation. BFA Studio Art ' +
      'coursework, Adelphi University, 2020 to 2021. 12 courses at Learn Squared with Jama ' +
      'Jurabaev, Greg Rutkowski, and Maciej Kuciara.',
  },
  {
    field: 'training',
    value: 'Lee Strasberg Theatre and Film Institute, two years, Advanced Method.',
  },
  {
    field: 'certification',
    value: 'AI Fluency: Framework & Foundations, from Anthropic, June 2026.',
    doc: 'certificate',
  },
  {
    field: 'mentorship',
    value:
      'graphic design and Photoshop under Stephen Fiore, Senior Digital Designer at Marvel ' +
      'Studios, ongoing.',
  },
  {
    field: 'research',
    value:
      'college-level Capstone and Research, 2017 to 2019. paper submitted to the Regeneron ' +
      'Science Talent Search.',
  },
  {
    field: 'screen',
    value:
      "co-star, Marvel Studios' Daredevil: Born Again (2025). campaign lead, New York Blood Center.",
  },
];

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: 'practice',
    name: 'practice',
    paras: [
      'the loop is short on purpose. an idea gets built far enough to actually use, then ' +
        'attacked: agent swarms running research, edge cases, and counterarguments in parallel, ' +
        'on a timescale where the answers still change the design.',
      // Mirrors the index's status vocabulary. If a status word changes in
      // cases.ts, this sentence changes with it.
      'most of what comes back is unglamorous and early, which is exactly when it is worth ' +
        'having. what survives ships with its evidence attached and labeled for what it is, ' +
        'whether that is built, tested, simulated, or a design study.',
    ],
  },
  {
    id: 'design-and-craft',
    name: 'design and craft',
    paras: [
      'i studied Concept Art and Illustration at CG Spectrum College of Digital Art and ' +
        'Animation, and finished with a Diploma in Concept Art. i was personally mentored in ' +
        'graphic design and Photoshop by Stephen Fiore, Senior Digital Designer at Marvel Studios.',
      'the training is 2D first: drawing, sketching, thumbnailing, and photobashing. it carries ' +
        'into 3D through Blender, texturing in Substance Sampler, and 3D paintovers. Figma is ' +
        'where the product work lands.',
    ],
  },
  {
    id: 'ai-practice',
    name: 'AI practice',
    paras: [
      'i have been studying and using GPT since GPT-2 in 2019, which is long enough to have ' +
        'watched the tooling change shape several times over.',
      'in practice that means Claude Code on both CLI and desktop, Claude Design, and Codex, ' +
        'plus agentic workflows i build and run myself: Ultracode in Claude Code, subagents in ' +
        'ChatGPT Work.',
      'i deploy and manage these rather than consume them as a service. that is the difference ' +
        'between a tools list and actual leverage.',
    ],
  },
  {
    id: 'research',
    name: 'research',
    paras: [
      'i studied college-level Capstone and Research from 2017 to 2019 and ran a months-long ' +
        "study on the effects of predatory food labeling on adolescents' nutritional choices and " +
        'awareness, including real human surveying. the full paper was recommended for and ' +
        'submitted to the Regeneron Science Talent Search.',
      'chellbook, on the product design channel, is a label-reading product. that is not a ' +
        'coincidence. what a label is really telling you, and who it quietly fails, is a question ' +
        'i have been working on since 2017.',
    ],
  },
  {
    id: 'performance',
    name: 'performance',
    paras: [
      'i studied for two years at the Lee Strasberg Theatre and Film Institute in New York City, ' +
        'appeared in multiple school productions, and was accepted into the school\'s Advanced ' +
        'Method courses. i was invited to private workshops there, including one hosted by ' +
        "Vincent d'Onofrio.",
      "i was a co-star in Marvel Studios' Daredevil: Born Again (2025) and the lead in a New York " +
        'Blood Center campaign that ran across network TV, social media, and streaming to tens ' +
        'of millions of views.',
      'the Method training is not a hobby sitting next to the design work. it is where i learned ' +
        'to research a person until their behavior makes sense from the inside, which is the ' +
        'same thing good user research asks for.',
    ],
  },
  {
    id: 'advocacy',
    name: 'advocacy',
    paras: [
      "i'm diagnosed with ADHD Type C and Cognitive Disengagement Syndrome.",
      'i advocate in my personal life for mental health treatment: helping people find ' +
        'providers, assembling the research and documentation that mental health insurance ' +
        'claims actually demand, and setting up AI tools that take executive-function load off ' +
        'the people carrying it.',
      'adhd mode, on the product design channel, comes directly from that.',
    ],
  },
  {
    id: 'references',
    name: 'references',
    paras: [
      '**Jeff Lin**, lead product designer at Goldman Sachs, and **David Lajara**, product ' +
        'designer at The Walt Disney Company, have both reviewed my portfolio and are offered ' +
        'as references.',
      '**Stephen Fiore**, senior digital designer at Marvel Studios, mentors me on an ongoing ' +
        'basis and is offered as a reference too.',
    ],
  },
];
