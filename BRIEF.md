# NiftyLTA brief

Self-authored under explicit creative delegation (the user said to use /ui-scroll-craft, /ui-apple-design and judgment, and to build first). Not interviewed. No generated imagery: the page is data, so the "world" is the chart itself.

## The eight topics

1. **Vibe.** Field notebook meets trading ledger. Warm paper, black ink, two signal colours (vermilion for ceiling, teal for floor). Calm, exact, unhurried. References: a printed almanac, a surveyor's level, a tide table.
2. **Journey (authored).** Orient (where is everything) > Method (what the yardstick is) > Board (who is near an edge) > Time machine (go back to the last touch and see what earnings looked like) > Ledger (every past touch, then vs now) > Aftermath (what the price did next) > Close (the board again, resolved).
3. **Energy.** Quiet, quiet, medium, loud, medium, quiet, still.
4. **Feeling curve** (below). **Peak:** the time machine.
5. **One thing no site does.** The right-hand side of the chart goes ghost as you travel back in time, so you literally cannot see the future while you read the P/E that was known on that day.
6. **Range.** Editorial and dense. Premium-minimal on the surface, ledger-dense where the numbers live.
7. **World.** Distinct chapters, one shared yardstick. No continuous flight.
8. **Assets.** User owns none for this page. All visuals are drawn from the data (SVG and HTML). No stock photography, no generated imagery, no holdings or account details anywhere.

## Feeling curve

| Act | Feeling | What causes it |
|---|---|---|
| Orient | Curiosity, a held breath | Eleven dots start bunched at the middle, then drift to their true places in the band as the reader scrolls |
| Method | Clarity, a small click of understanding | Four plain statements revealed by a left-to-right wipe over a schematic band |
| Board | Recognition, mild tension | Cards sorted by proximity to an edge, the two near the floor sit first |
| Time machine (peak) | Vertigo, then the quiet jolt of "oh, that is what it cost then" | The cursor walks back through the months, the future ghosts out, a P/E known on that day replaces today's |
| Ledger | Sober comparison | A horizontal rail of sheets, one per stock, each a ruled table of past touches |
| Aftermath | Humility | Dots scattered both sides of zero, small samples stated plainly |
| Close | Settled, honest | The board returns, still, with the limits written next to it |

## The peak

"I dragged the chart back to the last time Reliance hit the floor, the right half of the picture went faint, and the P/E that was known that day was sitting there next to today's." Lives in act 4, the longest span on the page (about 520vh).

## Tell-someone sentence

It is the site where you scroll back through a stock's monthly band and see what the earnings looked like the last time the price was where it is now.

## Grammar and score

Grammar: chaptered ledger (sticky chapters, one shared yardstick). Nav: translucent top bar with chapter anchors. Close: the board returns and holds.

| Beat | Device | Why |
|---|---|---|
| Orient | `scrub` (pinned, dots travel) | The reader's hand moves the dots, so the first thing they learn is that position matters |
| Method | `reveal` (clip-path wipe), text right-anchored | A definition is a change of state, not a journey |
| Board | stagger rise, centred header, grid | Many parallel items want to arrive together, not along a line |
| Time machine | `scrub` (pinned, cursor + ghost) plus a range slider and stock chips | Peak. Pointer and scroll both drive it |
| Ledger | `pan` (pinned, horizontal rail) | Lateral travel reads as "one per stock" |
| Aftermath | dot plot, stagger | Dispersion is the message, so show dispersion |
| Close | still | The page ends at rest |

Device families used: scrub, reveal, stagger, pan, still (5). Never the same family twice in a row (the two scrubs are separated by reveal and stagger). Scrub count: 2.

## Authored silence

The Method act has a deliberate empty beat after each statement lands. The close has no motion at all.

## Motion rules in force

transform, opacity and clip-path only. Smoothing is a spring-like approach to the target that always starts from the current on-screen value, so scrolling backwards mid-motion never jumps. `prefers-reduced-motion` removes smoothing and turns the pan into a native horizontal scroller. `prefers-reduced-transparency` and `prefers-contrast` are handled. No gradient text, no glow, no full-frame overlays, no counters, no scroll cue.

## Honest limits (shown on the page)

Screener gives 13 quarters, so earnings context exists only for touches from about Aug 2023. October 2026 is a partial month. Core earnings are an estimate (other income replaced by the stock's own median, 25 percent tax). Samples are 1 to 4 touches per stock per side. Not investment advice.
