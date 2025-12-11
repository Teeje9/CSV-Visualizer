# Design Guidelines: CSV Data Visualization & Insights Tool

## Design Approach
**System-Based Approach** using data visualization principles from Carbon Design System combined with modern dashboard patterns from Linear and Notion. The user explicitly requested a **clean, minimalist, dark theme** - this will be the foundation.

## Core Layout Structure

### Split-Screen Layout
- Left panel (40% width): Insights and statistics panel
- Right panel (60% width): Chart visualization area
- Both panels scrollable independently
- Responsive: Stack vertically on mobile (insights above, charts below)

### Upload State (Initial View)
- Centered upload zone with drag-and-drop area
- Large, welcoming dashed border zone
- Upload icon with clear CTA: "Drop your CSV here or click to browse"
- Supported formats and size limit text below (3-5MB)
- No hero image - keep it functional and focused

## Typography System

**Font Stack:**
- Primary: Inter (Google Fonts) for all UI text
- Monospace: JetBrains Mono for data values and statistics

**Hierarchy:**
- Page title: text-2xl, font-semibold
- Section headers: text-lg, font-medium
- Chart titles: text-base, font-medium
- Insights text: text-sm, font-normal
- Data values: text-sm, font-mono
- Labels/captions: text-xs, font-normal

## Spacing System
Use Tailwind units consistently: **2, 4, 8, 12, 16** for padding/margins
- Component padding: p-4 to p-8
- Section gaps: gap-8 to gap-12
- Tight spacing for related items: gap-2 to gap-4

## Component Library

### Upload Zone
- Large centered container (max-w-2xl)
- Dashed border with rounded corners (rounded-xl)
- Generous padding (p-12)
- Upload icon (64px) centered above text
- Hover state: subtle border highlight

### Insights Panel (Left)
- Sticky header with file name
- Card-based layout for each insight category
- Statistics displayed in grid (2 columns on desktop)
- Insight text blocks with subtle left border accent
- Icons for insight types (trend up/down, correlation, outliers)

### Chart Display (Right)
- Chart title bar with type indicator
- Full-width chart canvas with adequate padding
- Chart controls toolbar (chart type switcher, export)
- Legend positioned below chart
- Responsive chart sizing

### Statistics Cards
- Compact cards showing: label + value + unit
- Grid layout: 2-3 columns depending on space
- Monospace font for numerical values
- Small icons for metric type

### Insight Blocks
- Natural language text in comfortable reading width
- Left accent border for visual grouping
- Icon indicating insight type (trend, correlation, anomaly)
- Slight background differentiation from main panel

## Data Visualization Standards

**Chart Styling:**
- Clean, minimal gridlines
- Clear axis labels with adequate spacing
- Tooltips on hover with detailed information
- Legend with toggle functionality
- Consistent chart padding and margins

**Chart Colors:**
- Primary data series: Brand accent color
- Secondary series: Complementary palette
- Gridlines: Subtle, low contrast
- Text/labels: High contrast for readability

## Navigation & Controls

**Top Bar:**
- App logo/name (left)
- Current file name (center)
- Action buttons: New Upload, Export (right)

**Chart Controls:**
- Minimal icon-based toolbar
- Chart type selector (if multiple options available)
- Download chart button
- Full-screen toggle

## Responsive Behavior

**Desktop (lg):**
- Split-screen: 40/60 layout
- Multi-column statistics grids
- Side-by-side chart comparisons

**Tablet (md):**
- Split-screen: 45/55 layout
- 2-column statistics grids
- Stacked chart layouts

**Mobile (base):**
- Single column, vertical stack
- Insights panel collapses to accordion
- Single-column statistics
- Charts full-width with touch-friendly controls

## Interaction Patterns

**File Upload:**
- Drag-and-drop with visual feedback
- Click to browse fallback
- Progress indicator during processing
- Success state with smooth transition to results

**Chart Interactions:**
- Hover tooltips for data points
- Click to focus/highlight series
- Zoom and pan for dense datasets (optional)
- Export individual charts

**Insights Navigation:**
- Smooth scroll to relevant chart when clicking insight
- Expandable/collapsible sections for dense insights
- Jump-to-chart links in insight text

## Critical Quality Standards
- **No clutter:** Every element must serve a clear purpose
- **Data-first:** Charts and insights are the heroes, not decorative elements
- **Professional polish:** This should look like an enterprise analytics tool
- **Instant clarity:** User should immediately understand what each section shows
- **Performance:** Smooth transitions, no jank when rendering large datasets

This is a utility application where function drives form - clean, focused, and professional throughout.