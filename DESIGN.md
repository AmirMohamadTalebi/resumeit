---
name: ResumeIt
description: Compact Persian workspaces with icy surfaces and warm actions
colors:
  ice-surface: "#f7fafb"
  ice-canvas: "#edf3f6"
  ice-rail: "#1c2d38"
  ink: "#1d2c36"
  ink-secondary: "#435867"
  brown-action: "#875a36"
  brown-active: "#f2e6da"
typography:
  body:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "13px"
  navigation:
    fontFamily: "Vazirmatn, Tahoma, sans-serif"
    fontSize: "12px"
    lineHeight: 1.7
rounded:
  control: "8px"
  work-surface: "12px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  admin-button-primary:
    backgroundColor: "{colors.brown-action}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "9px 16px"
---

# Design System: ResumeIt

## Editorial pages

The blog index and article routes use a midnight-teal editorial masthead, Persian campaign covers, icy paper surfaces and warm-brown links. The index leads with one featured story followed by image-led rows. Articles pair their headline with the full uncropped cover, then use one continuous reading column beside a sticky contents rail. Phone layouts stack the header and put the contents before the prose. Preserve the public frosted navigation, Vazirmatn, visible focus and reduced-motion behavior. Styles are scoped in `dist/blog/editorial.css`.

## Overview

The ResumeIt workspace keeps the existing Persian RTL identity, Vazirmatn, icy blue, off-white and warm brown. This record describes the implemented administration workspace and shared navigation; the signature landing hero and the imported resume designs retain their own compositions.

## Colors

Warm brown identifies actions and the selected destination. Icy surfaces separate the reading canvas from work areas. The management rail uses the deepest existing ice tone; the user rail stays pale. Status colors retain the existing success, warning and error tokens.

## Typography

Use the existing locally hosted Vazirmatn. Management body text is compact; navigation remains distinct from headings. Dashboard headings scale from 22px to 28px. Information pages use a wider reading hierarchy and 65–75ch content measures. Imported resume fonts belong to the user-selected template, not the application shell.

## Layout

The administration rail is 224px and the user rail 236px. Main columns have min-width:0; tables scroll inside their own container. Admin draws a mobile menu below 760px; the user workspace does so below 960px, with four destinations plus a More control in the bottom bar. Templates expose one page, one section, one repeated item and at most eight fields per field page.

## Elevation & Depth

Management uses flat summaries, tonal grouping and fine separators. User editing surfaces keep the existing matte-glass treatment. Keep the established signature animation and respect reduced motion; loaders must not insert a minimum wait.

## Shapes

Management controls use restrained corners. The user workspace retains its existing rounded controls; sharing colors does not require every surface to have the same silhouette.

## Components

Group navigation by task. Mark the active route with aria-current and keep visible filter labels. Drawers make background content inert while open. Pop-up account menus must not reuse destructive selectors that match navigation groups. The footer places product navigation and legal/support navigation in separate columns; contact methods live on the contact page.

## Do's and Don'ts

- Do preserve the existing logo assets, Persian RTL and focus visibility.
- Do keep management tables paginated and template field pages bounded.
- Do distinguish provider acceptance from SMS delivery and actual access from inactive features.
- Do not apply the imported templates' decorative styles to the dashboard shell.
- Do not add blocking animation delays or fake payment states.
