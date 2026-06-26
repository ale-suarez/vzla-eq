---
name: Seismic Guard
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  margin-mobile: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  section-gap: 32px
---

## Brand & Style

The design system is centered on fostering a sense of **calm, clarity, and competence** during high-stress moments. The UI avoids alarmist visual cues, instead using a structured, spacious aesthetic that prioritizes legibility and expert guidance.

The style is a synthesis of **Modern Minimalism** and **Information-Dense Utility**, drawing inspiration from healthcare interfaces where precision is paramount. Key characteristics include:
- **Calm Authority:** Utilizing generous whitespace and a "light-first" approach to prevent cognitive overload.
- **Soft Precision:** High-radius corners (18px) are used to make the interface feel approachable and "human," contrasting with the technical nature of structural assessment.
- **Trust-Oriented Hierarchy:** Critical information (Safety Status, Confidence Levels) is isolated in prominent containers to ensure immediate understanding.

## Colors

The color palette is functional and communicative. **Trust Blue** serves as the primary anchor for actions and navigation, while a traffic-light semantic system (Green, Amber, Red) provides immediate feedback on safety status.

- **Primary (Blue):** Used for primary buttons, active navigation states, and progress indicators.
- **Semantic Colors:** Green for "No Damage," Amber for "Caution/Inconclusive," and Red for "Structural Risk." These colors should be applied with high-transparency backgrounds (10-15% opacity) for large containers to maintain a soft, non-threatening UI.
- **Backgrounds:** A two-tier system using pure White for cards and interactive surfaces, and Light Gray (#F8FAFC) for the canvas to provide subtle separation.

## Typography

The system uses a dual-font approach to balance personality and utility. **Plus Jakarta Sans** is used for headings to provide a modern, friendly, and approachable feel. **Inter** is used for all body text, data points, and labels to ensure maximum legibility and a systematic, high-trust appearance.

- **Hierarchy:** Use `label-caps` for section headers (e.g., "RESULTADO DEL ANÁLISIS") to create clear structural breaks.
- **Legibility:** Maintain a minimum line height of 1.5x for body text to assist reading in low-light or stressful environments.
- **Weight:** Avoid weights below 400. Use 600 (Semibold) for emphasis within assessment results.

## Layout & Spacing

The layout is a **Fluid Mobile Grid** designed for one-handed use. It follows a 4px baseline grid to ensure consistent alignment.

- **Safe Zones:** A 20px horizontal margin is enforced across all screens to keep content clear of screen edges.
- **Vertical Rhythm:** Elements are grouped in 24px stacks. Information within cards uses 16px padding.
- **Touch Targets:** All interactive elements (buttons, inputs, navigation) must maintain a minimum height of 48px.
- **Card-Based Layout:** Information is encapsulated in cards to create a clear "object" hierarchy, preventing the UI from feeling like a continuous list.

## Elevation & Depth

Depth is used sparingly to maintain a clean, flat aesthetic inspired by Apple Health. 

- **Surface Tiers:** The background is #F8FAFC. Active cards sit on the top layer at #FFFFFF.
- **Shadows:** Use a single, "Soft Ambient" shadow style for elevated cards: `0px 4px 20px rgba(0, 0, 0, 0.05)`. Shadows should be neutral, never tinted, to maintain a professional feel.
- **Outlines:** Inactive or secondary containers (like "Add Photos" or secondary buttons) use a `1px` stroke in #E2E8F0 instead of shadows to reduce visual noise.

## Shapes

The design system utilizes a generous 18px (`1.125rem`) corner radius for primary containers and buttons. This "Soft-Rounded" language communicates safety and approachability.

- **Containers:** Assessment cards and result blocks use the 18px radius.
- **Small Elements:** Chips, confidence meters, and input fields use a reduced 12px radius or full-pill shape (for status tags) to differentiate them from structural containers.
- **Images:** Uploaded photos should feature the same 18px radius to integrate seamlessly into the card layout.

## Components

### Buttons
- **Primary:** Full-width, #2563EB background, White text, 18px radius. Height: 56px.
- **Secondary/Ghost:** White background, 1px #E2E8F0 border, Dark Gray text. Use for "Add More" or "History."

### Confidence Meters
- Circular SVG indicators with a stroke-dasharray representing the percentage. Use primary blue or semantic green depending on the score.

### Timeline Recommendations
- Vertical line (2px wide, #E2E8F0) with circular nodes. Each node contains an icon or step number. This provides a clear, linear path for safety improvements.

### Assessment Cards
- Use a light tint of the semantic status color (e.g., 5% Success Green) as the background.
- Include a prominent 40x40px icon in the top left for immediate visual status.

### Bottom Navigation
- Fixed height of 84px (including safe area).
- Clean, outlined icons (24px). Active state uses Primary Blue and a subtle 4px dot indicator below the icon.

### Accordions (Expandable Sections)
- Use for detailed technical descriptions. Header features a chevron-down icon that rotates 180 degrees on expansion. Dividers between items are 1px, #F1F5F9.