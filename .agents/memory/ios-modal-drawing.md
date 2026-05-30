---
name: iOS modal drawing canvas
description: pageSheet modals on iOS conflict with drawing gestures; fullScreen is required for any canvas/signature UI
---

**Rule:** Use `presentationStyle="fullScreen"` (not `"pageSheet"`) for any modal that contains a drawing canvas or signature pad on iOS.

**Why:** `pageSheet` modals have a native iOS swipe-to-dismiss gesture that operates below React Native's gesture system. When a user tries to draw on a canvas, iOS interprets the finger movement as a drag-to-dismiss, physically moving the entire modal sheet. This cannot be prevented with PanResponder, `scrollEnabled={false}`, or `onPanResponderTerminationRequest: () => false` — the native gesture has higher priority than the JS gesture system.

**How to apply:** On any `<Modal>` component that hosts a signature/drawing canvas, set `presentationStyle="fullScreen"`. The slide-up animation (`animationType="slide"`) still works normally. Use `SafeAreaView edges={["top"]}` inside for the correct top inset.
