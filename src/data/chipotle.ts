/**
 * chipotle app ui cleanup — a pickup checkout and order confirmation redesign.
 *
 * Transcribed from `DESIGN_STORY.md` and `README.md` in the handoff package,
 * edited into the house voice but not restated. Section 13 of the design story
 * is a writing brief the author wrote for this purpose, and it is binding.
 *
 * FOUR CLAIM BOUNDARIES, ALL LOAD-BEARING.
 *
 * 1. NOTHING HERE SHIPPED, AND NOTHING WAS COMMISSIONED. This is an
 *    unsolicited redesign of an app he uses. `state` says "self-directed
 *    concept · not shipped · not affiliated with the app or its owner" and
 *    that phrasing is the boundary, not decoration.
 *
 *    The brand IS named, in two places and only two: `name`, which is the row
 *    label and the screen's display title, both at his explicit request. The
 *    prose below never uses it. That is a deliberate trade: naming the app is
 *    what makes the case legible, so the compensation is that `state` rides
 *    beside the title in the header, in the footer, and in the screen's own
 *    aria-label, where it cannot be read past.
 *
 * 2. THE VISUAL IDENTITY IN THE RENDERS IS ORIGINAL AND DELIBERATELY NOT THE
 *    APP'S BRAND. The warm off white surface, the deep green, the ocher link
 *    color and the two type families were drawn for this package. The handoff
 *    is explicit that swapping in a real palette changes none of the decisions.
 *    Do not describe the palette or the typefaces as anyone's brand assets.
 *
 * 3. THE STRIPED TILES ARE PLACEHOLDERS, NOT FINAL ART. Every image slot in
 *    the renders is a striped fill with a monospace label (`bowl`, `chips`,
 *    `map`) marking where real photography and a real map view belong. The
 *    renders are design renders, never production screenshots.
 *
 * 4. THE RESULT NUMBERS ARE APPROXIMATE AND THEY ARE NOT OUTCOMES. They were
 *    measured by hand off the four original screenshots at 402 by 874 logical
 *    pixels. Nothing shipped, so there is no conversion figure and no measured
 *    time to pay. `result` says so in its own body; keep it there.
 *
 * The `before/` screenshots are of a real company's real shipped app, included
 * as the screens the redesign responds to. Every criticism in `audit` and
 * `consistency` is tied to something visible in one of them.
 */

export interface ChipotleSection {
  id: string;
  name: string;
  paras: string[];
  /**
   * Which plate view this section is arguing over, by `CHIPOTLE_VIEWS` index.
   * Reading the column moves the plate to it; touching the plate never moves
   * the column. A section with no honest match leaves the plate alone, which
   * is why this is optional rather than defaulted.
   */
  view?: number;
}

export const CHIPOTLE = {
  /** The big letter-split title on the subpage, and the row name. */
  name: 'chipotle app ui cleanup',
  /** What the screen calls itself to assistive tech and on a phone. */
  title: 'pickup checkout and confirmation redesign',
  descriptor: 'a checkout that took three screenshots to show, rebuilt to fit on one',
  state: 'self-directed concept · not shipped · not affiliated with the app or its owner',
  role: 'product design: audit, IA, interaction, visual, prototype, engineering handoff',
  surface: 'pickup checkout and order confirmation, iOS, 402 by 874 logical pixels',
  /** The interactive prototype, hosted alongside this site. */
  demoHref: 'chipotle/checkout.html',
  demoLabel: 'open the interactive prototype',
  standfirst:
    'this is the pickup checkout in a fast casual restaurant iOS app: the screen where you ' +
    'confirm when to collect your food, confirm what it costs, and pay. i use it regularly and ' +
    'it always feels heavier than the task deserves. ordering a bowl and a bag of chips takes ' +
    'almost three screens of scrolling before i can pay. so i audited it, wrote nineteen ' +
    'findings, and rebuilt it: the checkout became one screen with nothing below the fold, one ' +
    'editing pattern instead of four, and a pickup time you step with a minus and a plus. the ' +
    'visual identity in the renders is original and deliberately not the real brand, the striped ' +
    'tiles are placeholders, and none of this shipped.',
} as const;

/**
 * The plate the standfirst opens on, and it is `before` deliberately: the
 * screen opens on the problem and the reader walks forward to the answer.
 *
 * Scroll section 0, not a member of CHIPOTLE_SECTIONS, so it carries its own
 * value.
 */
export const CHIPOTLE_LEAD_VIEW = 0;

export const CHIPOTLE_SECTIONS: ChipotleSection[] = [
  {
    id: 'rule',
    view: 0,
    name: 'the rule, and what it disqualifies',
    paras: [
      'one governing rule, the same one i hold every consumer product to: a five year old should ' +
        'be able to use this without help.',
      'that is a filter with teeth rather than a mood. a five year old cannot confirm an order ' +
        'they cannot see, and the checkout screen never says what is being bought. they cannot ' +
        'pick a time from a list that runs off the edge of the screen with nothing indicating the ' +
        'row scrolls. and they cannot be expected to learn that one thing is edited with a text ' +
        'link, the next with a horizontal scroller, and the third with a card that looks like a ' +
        'button and is not. each of those is a real thing on the screen, and the rule disqualifies ' +
        'all three before any drawing starts.',
    ],
  },
  {
    id: 'audit',
    view: 0,
    name: 'nineteen findings, and the four that mattered',
    paras: [
      'i went through the four screenshots and wrote up nineteen findings. the first one is the ' +
        'set itself: three of the four are the same checkout page at three scroll positions. a ' +
        'page that has to be photographed three times to be shown is already telling you something.',
      'two clocks disagree on the one fact that matters. the confirmation screen sets 12:30 PM in ' +
        'the largest type on the screen. the sheet below it says the restaurant is running a ' +
        'little behind. there is no revised time anywhere. the only question that screen exists to ' +
        'answer, when do i leave, now has two answers and neither can be trusted.',
      'napkins get a line item and the food does not. Napkins & Utensils sits at the top of the ' +
        'price rows printed as a 0.00 charge, which reads as a charge but is actually a ' +
        'preference, and there is no control on that screen to change it. the bowl and the chips ' +
        'never appear at all.',
      'a warning with no verb. "You seem far away from this location." names no distance, no ' +
        'consequence and no next step, and it uses an error icon for something that is not an ' +
        'error. it is styled as a failure, and it is a fact about a choice the customer made on ' +
        'purpose.',
      'the biggest object on the screen is not tappable. a black card roughly 440 pixels tall ' +
        'carries one sentence, "Use Apple Pay to pay for your meal." it looks exactly like a giant ' +
        'button and it does nothing. the real button sits below it, off screen, and reads "Order ' +
        'with Apple Pay" with no amount on it. roughly half a phone screen is spent teaching the ' +
        'customer a mistake.',
    ],
  },
  {
    id: 'consistency',
    view: 0,
    name: 'the rules you have to learn twice',
    paras: [
      'the rest of the nineteen are consistency errors, and they are the part i most wanted ' +
        'written down rather than quietly fixed. each one is a rule the customer has to learn ' +
        'twice. three equivalent things, three different ways to edit them: the store is plain ' +
        'text with a tracked caps CHANGE link; the time is a horizontal chip scroller whose first ' +
        'chip, "12:00 PM (QUICKEST)", packs two separate ideas into one pill; payment is a black ' +
        'card, plus a caps label, plus a button. counted across the whole flow that is four edit ' +
        'patterns for one class of job.',
      'the total appears four times on one screen, and the button people actually press does not ' +
        'show it. the sticky header states TOTAL 12.65, a Total row further down states 12.65, and ' +
        'below that sits a line reading "12.65 with Apple Pay" which cannot be pressed. and ' +
        'further up the same page, Bag Total 11.65 and Subtotal 11.65 are the same number on ' +
        'adjacent rows.',
      'case is inconsistent at the same level of hierarchy: TIP THE CREW and ROUND UP & DONATE are ' +
        'tracked caps while Bag Total, Subtotal, Tax and Total directly above them are sentence ' +
        'case. there are three link treatments in one flow. the round up opt in is a square ' +
        'checkbox, which is not an iOS control. the progress tracker labels all wrap to two lines ' +
        'and mix casing, so "Preparing your Order" sits between "Order Received" and "Ready for ' +
        'Pickup". and the status sheet covers the loyalty celebration mid sentence, slicing the ' +
        'line about points in half: the reward the screen is trying to give is cut off by another ' +
        'element.',
      'two things hold real estate they have not earned. the pickup and delivery switch is pinned ' +
        'above every scroll position, is rarely flipped mid checkout, and silently invalidates the ' +
        'chosen store and the chosen time when it is flipped. that is a destructive control in the ' +
        'best seat on the screen. and the pickup info block spends roughly 200 vertical pixels on ' +
        'eight words and a spot illustration, describing a shelf the customer will not see for ' +
        'another twenty minutes.',
    ],
  },
  {
    id: 'system',
    view: 0,
    name: 'the system i set before drawing',
    paras: [
      'i settled the scope first, because each of these changes the layout completely. full ' +
        're-architecture: checkout becomes a summary with tap to edit sheets. the price breakdown ' +
        'collapses to a single Total row, expandable to show the detail. tip stays at checkout ' +
        'because it is about this order, and round up and donate moves to after payment. pickup ' +
        'instructions come out of checkout entirely, since they describe something that happens ' +
        'twenty minutes later. and the distance warning is demoted to a factual line, because a ' +
        'warning with no action is just anxiety.',
      'then one decision per element class, so the screens could not drift apart. one edit ' +
        'affordance: anything editable is a row whose right hand side reads Change, and Change ' +
        'opens a sheet. every number stated once, so the total lives in the Total row and on the ' +
        'button and nowhere else. type does the hierarchy, not containers. hairlines rather than ' +
        'cards, on a single rhythm, so no section can look more important than another by ' +
        'accident. copy is labels and numbers, with sentences only where a sentence changes ' +
        'behavior. and nothing below the fold: if it does not fit on a 402 by 874 screen, that is ' +
        'the wrong amount of content, not a scrolling problem.',
    ],
  },
  {
    id: 'explorations',
    view: 1,
    name: 'three takes, built rather than argued about',
    paras: [
      'i built three checkout takes plus a redesigned confirmation screen, all interactive, ' +
        'because the differences needed to be felt rather than argued about. ledger is the by the ' +
        'book version: a bag card, a pickup card with two matching rows, a tip card, a collapsible ' +
        'total and a fixed pay bar. it fixes every consistency error and it is the safest thing to ' +
        'ship. its weakness is that five white cards end up competing at the same weight, so the ' +
        'two things that matter, the time and the total, do not win.',
      'ticket is one continuous receipt: the pickup time as a 52 pixel hero, dashed rules, dotted ' +
        'leaders and a perforated stub for the total. it is the most characterful of the three and ' +
        'it makes the time unmissable. its weakness is that the decoration spends attention it has ' +
        'not earned, and dotted leaders read badly at 14 pixels.',
      'the third take is the five year old rule applied literally, and i called it big and dumb, ' +
        'the complimentary kind. one pickup time with a minus and a plus button. one line per ' +
        'decision. four words of body copy. a 56 pixel pay button. no cards at all, just ' +
        'hairlines. it won, with ticket’s expandable total folded into it.',
      'the reason is the stepper. a horizontal scroller asks the customer to read five options, ' +
        'understand that the list continues off screen, and pick. a single time with a minus and a ' +
        'plus asks them to read one number and, if they do not like it, press one of two buttons. ' +
        'that is the difference between a choice and a decision. it also solves the clipped third ' +
        'chip, which was the complaint i started with.',
      'a stepper has one obvious failure, which is what happens at the end of the list. pressing ' +
        'plus past the last preset, 12:45 PM, now opens a Later today sheet instead of dead ' +
        'ending, and stepping back from the earliest later time returns to the last preset. i also ' +
        'deleted the hint that read "Tap minus for sooner, plus for later", because a control that ' +
        'needs instructions is the wrong control.',
    ],
  },
  {
    id: 'confirmation',
    view: 2,
    name: 'one clock',
    paras: [
      'the confirmation screen has one job: say when the food will be ready. so it carries one ETA ' +
        'and that number is the single source of truth. if the kitchen slips, the number itself ' +
        'changes and a tag explains why. never a delay message under an unchanged time. that is ' +
        'the entire fix for the two clocks finding, and it is one sentence long.',
      'the delay sentence went with it. it started as "Kitchen is slammed, we moved your time back ' +
        '5 minutes", which was too blunt, became a casual line, then stopped being a line at all: ' +
        'its warmth folded into the tag, which reads RUNNING 5 MIN LATE rather than 5 MIN LATER ' +
        'followed by a sentence repeating it. the points line dropped to subtitle scale and turned ' +
        'green, because a reward is positive information and green says so before the words are ' +
        'read.',
      'the tracker is three steps, one word each, Cooking, Bagged and On the shelf, which is the ' +
        'fix for labels that all wrapped to two lines and mixed their casing. rebuilding it as a ' +
        'three column grid so each label sat under its own dot exposed a second problem: the ' +
        'progress fill ran past the middle dot, implying the Bagged step was complete when it was ' +
        'not. the fill was pulled back into the first segment.',
      'the rest was making it read as the page after checkout rather than a different app: the ' +
        'same centered time construction with the meridiem beneath it, the tracked caps order ' +
        'label deleted since the checkout screen has no caps labels at all, row scale matched at ' +
        '18 pixel titles and 14.5 pixel secondary text, dividers on the same rhythm, and both ' +
        'secondary buttons changed to the same outlined pill.',
    ],
  },
  {
    id: 'reversal',
    view: 2,
    name: 'the map i deleted, then made four times bigger',
    paras: [
      'round five compacted my own confirmation screen. i removed the small shelf and map ' +
        'thumbnails, because at 52 pixels they carried no information. i made the receipt ' +
        'permanently open, on the grounds that a receipt you have to tap is not a receipt. between ' +
        'them those two changes freed enough height for a real map at roughly 280 pixels, full ' +
        'bleed to the frame edges, with the address on a white chip and a Directions button on it. ' +
        'that button has since become an icon, which is the next entry.',
      'so in one round i deleted a map for being useless and then put a map back at four times the ' +
        'size. i have kept that in the log rather than tidying it away, because it is the most ' +
        'useful thing in the project.',
      'the distinction is not about maps. a 52 pixel map is decoration and a 280 pixel map answers ' +
        'where am i going without being read. same subject, same screen, same data. the size is ' +
        'the entire difference between noise and information.',
      'the rule i had been applying, remove anything that carries no information, would have ' +
        'deleted the thumbnail and stopped there. it is a rule about elements, and what i actually ' +
        'needed was a rule about elements at the size they are drawn. i would show this decision ' +
        'before any of the others, because getting it wrong in the first direction leaves a screen ' +
        'full of ornaments, and getting it wrong in the second leaves a screen that has been ' +
        'cleaned until it stopped answering anything.',
    ],
  },
  {
    id: 'icons',
    view: 3,
    name: 'when an icon costs less than a sentence',
    paras: [
      'the confirmation screen still had two wordy controls on it. the original app has a tracked ' +
        'caps text link for saving the store. my version had a button with the word Directions on ' +
        'it. both are now 44 pixel circles sitting together on the map, a heart and an arrow. the ' +
        'gap between them dropped from 10 pixels to 9, so the two circles read as one pair.',
      'the rule behind it is that an action can drop its words when the action is obvious from ' +
        'the thing it acts on. a heart means save. an arrow in a diamond means go there. both sit ' +
        'right next to the address they act on, so neither one has to say which store it means.',
      'i turned that into four questions, and a control has to pass all four. is the symbol one ' +
        'people already know, or would they have to learn it here? is the thing it acts on named ' +
        'right beside it? is the action easy to undo? can you see the state without reading ' +
        'anything? the filled heart answers that last one by itself, which is the whole reason it ' +
        'can go without a label.',
      'a control that fails any of those keeps its words. the pay button is a full sentence with ' +
        'the amount in it. "Something wrong?" is still a button with the words on it. the tip ' +
        'presets are still dollar amounts. money and mistakes get words. i also wrote down where ' +
        'the rule stops, because this is the kind of rule that is easy to run too far. Edit bag ' +
        'and Change stay as text. if a five year old would have to be told what a control does, ' +
        'it needs a word on it.',
      'the same rule did two bigger things earlier in the flow. a 440 pixel black card carrying ' +
        'one sentence about Apple Pay became a 38 by 25 pixel mark and two words in a 25 pixel ' +
        'row. the pickup time scroller became a minus and a plus around one time. but the line ' +
        'about grabbing your order off the shelf failed the first question, because a shelf is ' +
        'not a symbol anyone knows, so it stayed a sentence and just got smaller and moved. what ' +
        'i was after was less reading. an icon is one way to get there and a shorter sentence in ' +
        'a better place is another.',
    ],
  },
  {
    id: 'iteration',
    view: 4,
    name: 'the rest of the log',
    paras: [
      'the total breakdown started as a second thing to tap. it ended up sitting open by default ' +
        'and folding away exactly when the bag list expands: one pocket of space doing two jobs, ' +
        'so the pay button never moves. the Total row lost its chevron at the same time, since it ' +
        'is no longer independently tappable.',
      'two copy corrections belong in the same log. "Syosset, 22 min from you" became "Syosset, 14 ' +
        'mi away", because miles are the useful unit for a decision about leaving and "from you" ' +
        'was redundant. and the animated count up on the total came out: a price that rolls like a ' +
        'slot machine draws attention to the wrong thing.',
      'two real defects, both structural. the clock went blank once, because the later time index ' +
        'in state pointed at a slot that no longer existed and the lookup returned nothing. and ' +
        'rapid taps on the stepper collapsed into a single step, because each handler computed its ' +
        'next value from the render it was created in rather than from live state. fixing the ' +
        'second at the source also removed the cause of the first, and both indexes are now ' +
        'clamped on read, so the clock always has a value regardless of state.',
    ],
  },
  {
    /*
      No `view`, deliberately. The result and the open questions hold whatever
      the log left up: neither argues over a specific screen, and sending the
      plate back to an earlier view here is exactly the backwards jump the walk
      order exists to prevent.
    */
    id: 'result',
    name: 'what it measures out at',
    paras: [
      'nothing here shipped, so none of these are outcomes. they are measurements of the redesign ' +
        'against the original screenshots, taken by hand at 402 by 874 logical pixels, and they ' +
        'are approximate.',
      'scroll to pay: about 2.7 screens, down to one screen with nothing below the fold. body ' +
        'copy: about 92 words, down to about 24, labels excluded. edit patterns: four, down to ' +
        'one. times on screen at confirmation: two that could disagree, down to one that cannot.',
      'the last of those is the only one i would defend as a result rather than a reduction. the ' +
        'other three count things removed, and removing things is easy to do badly. the ' +
        'confirmation screen now carries a single ETA which moves when the kitchen slips, with a ' +
        'tag that says why it moved. there is no arrangement of that screen in which the number ' +
        'and the apology can contradict each other, because there is no second number to ' +
        'contradict.',
      'and the renders are renders. the striped tiles with monospace labels where the bowl, the ' +
        'chips and the map belong are placeholders, not final art. the warm off white surface, the ' +
        'deep green, the ocher links and the two type families are an identity i drew for this ' +
        'package, deliberately not the app’s real brand, because this is an independent ' +
        'redesign and not work done inside the company that owns the app. the structure, the ' +
        'hierarchy, the copy and the interaction model are the deliverable. dropping in a real ' +
        'palette and real photography changes none of the decisions above.',
    ],
  },
  {
    id: 'open',
    name: 'what is still open',
    paras: [
      'the confirmation screen’s central fix depends on a number i do not control. does the ' +
        'store API return a revised ETA when the kitchen slips, or only a boolean? if it is only a ' +
        'boolean, the screen can say that something is wrong but not when, and the two clocks come ' +
        'back in another form.',
      'four more for the team. is the round up partnership contractually required before payment, ' +
        'because if it is then moving it after payment is not available and it becomes one switch ' +
        'row with the legal line behind an info tap. can the napkins preference move to a bag ' +
        'level toggle, or is it wired to the price object. is there analytics on pickup to ' +
        'delivery switches that happen at checkout, because that number is what decides whether ' +
        'the sticky mode switch can come out at all. and the tip presets are flat dollar amounts, ' +
        'which above a basket of roughly 25 dollars probably should scale, though that has an ' +
        'answer in the data rather than in my preference.',
      'the accessibility work is specified but not verified. the stepper buttons are icon only, so ' +
        'they need labels and they need to announce the resulting time after each press. the ' +
        'disabled minus is communicated by opacity alone and has to be marked disabled for ' +
        'assistive tech as well. the tracker communicates progress with color and position, so the ' +
        'current step needs to be exposed as text. the tertiary grays want a contrast check ' +
        'against the surface before anyone ships them. the screen is drawn to fit without ' +
        'scrolling at default dynamic type, and at the largest sizes it should scroll rather than ' +
        'compress.',
      'one more that only real data can settle. the saved heart fills with the same green as the ' +
        'map pin, and the two sit in the same corner about 250 pixels apart. it reads fine over ' +
        'the striped placeholder. over a real map with roads and labels behind it, it might not, ' +
        'and then the saved state should move to the ocher the links already use.',
      'five things are not designed at all: the change location sheet, the change payment method ' +
        'sheet, the round up ask this redesign moves to after payment, delivery mode (which shares ' +
        'this screen in the current app, and which the audit argues belongs back in the bag one ' +
        'step earlier), and checkout with six or more items, where the bag list will need a scroll ' +
        'of its own.',
    ],
  },
];

/**
 * The scannable column: what the work was and what it produced.
 *
 * SEVEN ROWS IS THE CEILING. The column runs from `glanceRowsY` (380) to the
 * band's end at 976, which is 596px, and these values wrap to two and three
 * lines at this width. Nine rows measured 686px and ran 90px into the footer.
 * Adding a row means shortening two others.
 */
export const CHIPOTLE_GLANCE: { field: string; value: string }[] = [
  { field: 'client', value: 'none. self-directed and unsolicited, and it did not ship' },
  { field: 'surface', value: 'pickup checkout and order confirmation, iOS, 402 by 874' },
  { field: 'the problem', value: '19 findings, and about 2.7 screens of scrolling to pay' },
  { field: 'the change', value: 'one screen, nothing below the fold, one edit pattern, one clock' },
  { field: 'the reversal', value: 'a 52 pixel map cut as decoration, a 280 pixel map added as information' },
  {
    field: 'delivered',
    value: 'two final screens, two rejected takes, a prototype, an audit, a handoff',
  },
  {
    field: 'the renders',
    value: 'an original identity, not the brand. striped tiles are placeholders',
  },
];
