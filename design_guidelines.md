# TerraCotta Investments LLC - Design Guidelines

## Design Approach: Carbon Design System

**Justification**: This financial portal requires a professional, data-heavy interface optimized for clarity, trust, and efficient information processing. Carbon Design System excels at enterprise applications with complex data displays, extensive form interactions, and hierarchical information structures. Its systematic approach ensures consistency across the extensive feature set while maintaining the gravitas required for financial applications.

**Core Principles**: 
- Clarity over decoration - every element serves a purpose
- Data-first presentation - charts and tables are hero elements
- Hierarchical information architecture - clear visual priority
- Trustworthy professionalism - conservative, reliable aesthetic

---

## Typography System

**Font Family**: IBM Plex Sans (via Google Fonts CDN)
- Primary: IBM Plex Sans (body text, UI elements)
- Mono: IBM Plex Mono (numerical data, account numbers, codes)

**Type Scale**:
- **Page Titles**: text-3xl font-semibold (Dashboard, Reports, etc.)
- **Section Headers**: text-2xl font-semibold 
- **Card Titles**: text-xl font-medium
- **Subsection Headers**: text-lg font-medium
- **Body Text**: text-base font-normal
- **Secondary Text**: text-sm font-normal
- **Captions/Labels**: text-xs font-medium uppercase tracking-wide
- **Financial Figures**: text-2xl to text-4xl font-bold (IBM Plex Mono for large numbers)

**Hierarchy Rules**:
- All financial metrics use monospaced font for scanability
- Currency values always bold weight
- Positive/negative indicators use font-semibold with directional icons
- Data table headers use text-xs uppercase with tracking-wide

---

## Layout & Spacing System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16, 20**

**Application**:
- Component padding: p-6 (cards), p-4 (smaller elements)
- Section margins: mb-8, mt-12
- Grid gaps: gap-6 (card grids), gap-4 (form fields)
- Container padding: px-6 lg:px-8
- Vertical rhythm: space-y-6 for stacked content

**Grid System**:
- Dashboard: 12-column grid with responsive breakpoints
- Primary content area: max-w-7xl mx-auto
- Sidebar: fixed width 256px (w-64)
- Card layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

---

## Navigation & Information Architecture

**Sidebar Navigation**:
- Fixed left sidebar (w-64) with subtle separation treatment
- Logo/company name at top (h-16 flex items-center)
- Navigation items with icon + label (py-3 px-4)
- Active state: distinct treatment with subtle left border indicator
- Grouped sections: "Financial", "Management", "Settings"
- Role-based conditional rendering (Admin-only items clearly separated)
- User profile section at bottom with logout option

**Top Bar**:
- Fixed height (h-16)
- Breadcrumb navigation for deep pages
- Right-aligned: notification bell icon, user avatar dropdown
- Search functionality for quick navigation (transactions, members)

---

## Component Library

### Dashboard Components

**Metric Cards** (Key Performance Indicators):
- Grid layout: 2x2 on desktop, stacked on mobile
- Structure: Large number (text-4xl font-bold mono), label below (text-sm uppercase), trend indicator (icon + percentage)
- Height: min-h-32, padding: p-6
- Includes sparkline mini-charts where relevant

**Chart Containers**:
- Full-width or half-width depending on data complexity
- Header: title (text-xl), time period selector, export button
- Padding: p-6, margin-bottom: mb-8
- Recharts with clean grid lines, clear axis labels
- Legend positioned top-right

**Recent Activity Feed**:
- List of 5-8 recent transactions
- Each item: left icon, transaction details (middle), amount (right, mono font)
- Alternating subtle row treatment for scanability
- "View All" link at bottom

### Data Tables

**Standard Table Structure**:
- Sticky header row with sorting indicators
- Striped rows for improved readability (even/odd treatment)
- Fixed column widths for numerical data (right-aligned)
- Text columns left-aligned with text-sm
- Row height: h-12 for comfortable touch targets
- Pagination at bottom (max 25 rows per page)
- Bulk actions toolbar appears on row selection

**Financial Data Tables**:
- Dedicated amount column always right-aligned, monospaced, bold
- Date column: fixed width, text-sm
- Category column: includes small pill badge
- Action column: right-aligned icon buttons (edit, delete)

### Forms & Inputs

**Form Layout**:
- Two-column on desktop (grid-cols-2 gap-6), single column on mobile
- Full-width for textareas and complex inputs
- Label above input (text-sm font-medium mb-2)
- Helper text below (text-xs)
- Required field indicator (asterisk)

**Input Fields**:
- Height: h-12 for text inputs
- Padding: px-4
- Clear focus states with ring treatment
- Disabled state visually distinct
- Error states with descriptive messages below field

**Specialized Inputs**:
- Currency: prefix "$" symbol, right-aligned monospaced numbers
- Date pickers: calendar dropdown interface
- Category selectors: searchable dropdown with icons
- Member selectors (Admin): autocomplete with avatar thumbnails

**Buttons**:
- Primary CTA: px-6 py-3 text-base font-medium
- Secondary: outlined variant
- Icon buttons: square (h-10 w-10) for table actions
- Button groups: connected with shared borders

### Reports & Exports

**Report Header**:
- Title + date range prominent at top
- Filter controls: inline dropdowns and date selectors
- Action bar: Download PDF, Export Excel, Print buttons (right-aligned)
- Spacing: pb-8 to separate from report body

**Report Sections**:
- Clear section dividers (border-b with pb-6 mb-8)
- Summary cards at top (total income, expenses, profit)
- Detailed breakdown tables below
- Charts interspersed for visual interest
- Footer with generation timestamp and user info

### Admin-Specific Components

**User Management Table**:
- Avatar + name in first column
- Role badge (pill style)
- Status indicator (active/inactive dot)
- Last login timestamp (text-sm)
- Quick actions dropdown (right-most column)

**Audit Trail**:
- Timeline-style layout with left-side timestamp column
- User avatar + name
- Action description with before/after comparison
- Expandable rows for detailed change logs
- Filter sidebar: user, action type, date range

**Setup Configuration**:
- Section-based layout (Categories, Payment Methods, Settings)
- Inline editing where possible
- Add new item forms appear inline
- Drag handles for reordering priority

### Profile Page

**Profile Layout**:
- Two-column: left (profile photo, basic info), right (editable fields)
- Section tabs: Personal Info, Security, Preferences, Login History
- Login history: table with device, location, timestamp
- Change password: separate modal for security

---

## Data Visualization Standards

**Chart Color Palette** (Recharts configuration):
- Use distinct hues for different data series
- Income/positive: green spectrum
- Expenses/negative: red spectrum  
- Neutral metrics: blue/purple spectrum
- Maintain sufficient contrast for accessibility

**Chart Types**:
- Line charts: monthly/annual trends, performance over time
- Bar charts: category comparisons, period-over-period
- Pie/Donut: category breakdowns (limit to 6-8 slices max)
- Area charts: cumulative metrics, stacked categories
- Sparklines: inline trend indicators in metric cards

**Chart Specifications**:
- Grid lines: subtle, horizontal only for most cases
- Axes: clear labels, appropriate scale intervals
- Tooltips: on hover with precise values
- Legends: positioned consistently (top-right or bottom)
- Responsive: adjust complexity/labels on mobile

---

## Responsive Behavior

**Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)

**Mobile Adaptations** (< md):
- Sidebar: collapsible overlay drawer
- Metric cards: stacked single column
- Tables: horizontal scroll in container OR card-based view for critical tables
- Charts: simplified with fewer data points, vertical layouts
- Forms: full-width single column
- Navigation: hamburger menu icon reveals sidebar

**Tablet** (md to lg):
- Sidebar: persistent or collapsible based on screen width
- Metric cards: 2-column grid
- Hybrid layouts for better space utilization

---

## Accessibility & Interaction States

**Focus Management**:
- Clear keyboard navigation order
- Visible focus rings on all interactive elements
- Skip-to-content link for keyboard users

**State Indicators**:
- Hover: subtle shift for interactive elements
- Active/Selected: distinct treatment
- Disabled: reduced opacity with cursor-not-allowed
- Loading: skeleton screens for data tables, spinners for actions

**Contrast & Readability**:
- Maintain WCAG AA standards minimum
- Financial figures have extra emphasis through weight and size
- Error states clearly distinguished from normal state

---

## Professional Polish

**Empty States**: 
- Centered icon + message + CTA button
- Helpful guidance for first-time users
- "No transactions yet" → "Add your first transaction" button

**Loading States**:
- Table skeleton: animated placeholder rows
- Chart skeleton: grey boxes matching chart dimensions
- Inline spinners for button actions

**Success/Error Feedback**:
- Toast notifications (top-right): transaction saved, user created, etc.
- Inline validation messages for forms
- Confirmation modals for destructive actions (delete user, remove transaction)

**Micro-interactions**:
- Smooth transitions for expanding sections
- Subtle hover effects on clickable elements
- Number animations when metric values update (count-up effect)

---

This design system creates a professional, trustworthy financial portal that prioritizes data clarity, efficient workflows, and role-appropriate access while maintaining visual consistency across all features.