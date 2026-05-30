---
name: PanResponder stroke batching bug
description: React 18 auto-batching causes strokes to vanish when ref is read lazily inside setStrokes functional updater
---

**Rule:** In PanResponder handlers, always capture mutable ref values into a local `const` *before* calling `setStrokes` (or any `setState`). Never read `someRef.current` inside the functional updater `(s) => ...`.

```js
// WRONG — reads activeStroke.current lazily, may see "" after release
onPanResponderMove: (e) => {
  activeStroke.current += ` L${x},${y}`;
  setStrokes((s) => [...s.slice(0, -1), activeStroke.current]); // ← bug
},

// CORRECT — captures value eagerly before the updater runs
onPanResponderMove: (e) => {
  const path = activeStroke.current + ` L${x},${y}`;
  activeStroke.current = path;
  setStrokes((s) => [...s.slice(0, -1), path]); // ← safe
},
```

**Why:** React 18 automatic batching can delay functional updater execution until after subsequent event handlers (e.g. `onPanResponderRelease`) have already mutated the ref. The updater then reads the cleared value (`""`) and replaces the last stroke with an empty path — making strokes appear to vanish on finger lift.

**How to apply:** Any time a PanResponder callback calls `setState` with a functional updater that references a `useRef` value, capture that ref value into a local variable first.
