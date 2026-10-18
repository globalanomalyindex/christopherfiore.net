import type { CaseStudy } from './casestudies.ts';

export const JELLYBOX: CaseStudy = {
  id: 'jellybox',
  name: 'jellybox',
  meta: 'a design system study in density, continuity, color and light. built interactive prototype, 2026.',
  lede:
    'i wanted the material of an interface to help explain its structure. jellybox is a working study of three buttons that take turns becoming part of a shared window, then gather back into the trio.',
  lead: {
    src: '/jellybox/hero.jpg',
    alt: 'JellyBox in the browser: a black organic logo above three translucent blue buttons and a movable light on a textured surface',
    caption: 'the working experiment. three buttons, one shared material, a movable light.',
    width: 1442,
    height: 980,
  },
  glance: [
    { field: 'my role', value: 'design, interaction, motion and implementation' },
    { field: 'tools', value: 'figma, codex, react, webgl and spectral.js' },
    { field: 'scope', value: 'three tools for exploring motion, color and material, with an adjustable light' },
  ],
  sections: [
    {
      id: 'the-question',
      name: 'why jelly',
      paras: [
        'the colorful translucency of old macintosh interfaces and frutiger aero gave me the starting point. i wanted to carry that energy into a system where the material has a job: explaining hierarchy, grouping, selection and change.',
        'i began with separate components, then narrowed the experiment to three buttons. that smaller scope let me work on how they relate to each other before trying to build a larger workspace.',
      ],
    },
    {
      id: 'density',
      name: 'density becomes structure',
      paras: [
        'a border can be a denser part of the same material. the window gathers into a firmer edge and thins across its reading area. inside it, shape & optics expands from a compact pill into a folder for extra controls, then gathers back.',
        'the material changes its edge, depth and lighting together. labels and values stay steady. that separation lets the surface be expressive while the controls remain predictable.',
      ],
      figure: {
        src: '/jellybox/light-off.jpg',
        alt: 'The open Explore window with a dense dark rim, anchored controls, a blue selected option, and saved-look actions while the light is off',
        caption: 'explore, with the light off. the selected rim, checkmark and readable values carry the state.',
        width: 1442,
        height: 980,
      },
    },
    {
      id: 'continuity',
      name: 'motion explains ownership',
      paras: [
        'opening a tool turns its button into a tab on the window’s top-left edge. switching tools lets that tab withdraw while the next takes its place. closing gathers the window back into the trio.',
        'i shaped the stretch, pinch and settling with custom curves and damped motion. interrupted transitions continue from their current state. the jelly can move toward the cursor, but its actual click target stays anchored.',
      ],
    },
    {
      id: 'color-and-light',
      name: 'color and light share the material',
      paras: [
        'spectral.js supplies the pigment-inspired mixing path. the controls and window follow the same precomputed color samples, including when a palette changes during a transition. a preview comes before applying a palette; labels, checks and focus indicators also communicate the choice.',
        'the movable bulb works like a lamp on a physical desk: place it, adjust it, and let it sit ambiently while you work. its position, brightness, height, softness and warmth change highlights, colored casts and transmitted light through the jelly. it stays independent of hover or task selection. reading areas keep those effects quieter, and controls retain their meaning with the light off.',
      ],
    },
    {
      id: 'interaction',
      name: 'expression needs a stable control',
      paras: [
        'sliders keep a short rail, label and value visible, then their material gathers on approach or focus. value bubbles can be dragged, with shift for finer adjustment and escape to cancel. keyboard input, visible focus and reduced-motion support are part of the implementation.',
        'these are working interactions. the larger design question is whether density, motion and light help someone understand where they are and what changed.',
      ],
    },
    {
      id: 'what-is-proven',
      name: 'what the study establishes',
      paras: [
        'the prototype gives me one place to develop the rules and inspect their behavior together. its geometry, lighting and settling are authored real-time approximations; spectral.js describes pigment mixing. this is not a physically validated jelly simulation.',
        'i have not established a usability benefit. testing whether the material helps people follow grouping, ownership and change is the next question. larger workspaces are a direction for the system to grow.',
      ],
    },
  ],
  links: {
    name: 'the experiment',
    sentence: [
      'you can open the ',
      { btn: 'working demo', href: 'https://globalanomalyindex.github.io/jellybox/', newTab: true },
      ', including my full design story, or inspect the ',
      { btn: 'source on github', href: 'https://github.com/globalanomalyindex/jellybox', newTab: true },
      '.',
    ],
  },
  summary: 'jellybox is a working interface study in density, continuity, color and light. three buttons explore how a shared material can explain structure and change.',
};
