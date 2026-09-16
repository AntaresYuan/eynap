# PRD Protocols Reference

This document defines the structural standards, naming conventions, and writing strategies for Product Requirement Documents (PRDs).

---

## Document Naming

Format: `vX_Y_<short_description>_<yyyymmdd>.md`

| Component | Meaning | Example |
|-----------|---------|---------|
| `vX_Y` | Major.minor version | `v1_0`, `v1_1`, `v2_0` |
| `short_description` | Underscore-joined keywords | `mvp_core`, `feat_login` |
| `yyyymmdd` | Date | `20260301` |

**Examples:**
- Framework PRD: `v1_0_mvp_core_workflow_20260301.md` (lives in `docs/02_PRD/`)
- Feature PRD: `v1_0_feat_notification_center_20260301.md` (lives in `docs/02_PRD/`)
- Strategy Doc: `v1_0_value_and_scope_20260301.md` (lives in `docs/01_STRATEGY/`)

---

## Document Hierarchy

Two distinct levels. Never collapse them into one file.

| Level | Type | Scope | Focus |
|-------|------|-------|-------|
| **Level 1** | **Framework PRD** | Entire Product / MVP | The "Skeleton". Connects value, journeys, screen structure, and data model. |
| **Level 2** | **Feature PRD** | Single Module | The "Flesh". Detailed logic, edge cases, field-level rules, UI states. |

---

## Level 1 · Framework PRD Structure

**File:** `docs/02_PRD/vX_Y_mvp_framework_...md` (and linked from `docs/02_PRD/README.md`)

The Framework PRD is not just a summary; it is a **coherence check**. It uses the **"Three-Pass Journey"** method to validate the product from three distinct perspectives.

### Section 1: Background & Value Scope
*Reference or summarize `docs/01_STRATEGY/`.*
- **Target Audience:** Who are we building for?
- **Core Value:** What is the "Tangible Anchor" (from Scene 1)?
- **MVP Boundary:** Explicit In/Out list.

### Section 2: Critical User Journeys (Pass 1: Mental Model)
*The human perspective.*

> **Strategy:** Describe the journey as a narrative story. Include **time gaps** ("user waits 30s", "comes back the next day"), **psychological states** ("anxious about price"), and **context**. Do not mention specific buttons or pages yet. Focus on *intent* and *behavior*.
>
> **Output Standard:** A rich narrative.
> - *Bad:* "User clicks login, then clicks buy."
> - *Good:* "User receives a stock alert email while at lunch. They open the link immediately, worried the item will sell out. They quickly verify the price matches the alert, then complete the purchase in under 1 minute to secure the stock."

### Section 3: Screen Tree & Navigation (Pass 2: Interaction Anchor)
*The spatial perspective.* **Must be defined BEFORE entities.**

1.  **Global Navigation Map:** A tree structure of the app (e.g., Tab Bar -> Pages -> Sub-pages).
2.  **Journey Refinement (Pass 2):** Re-map the Section 2 journeys onto this tree.
    - Where does the user land?
    - What specific visual element do they interact with?
    - How do they navigate from Step A to Step B?

> **Strategy:** Validate "Wayfinding". Ensure every step in the mental model (Pass 1) has a visible landing spot (Pass 2).
>
> **Output Standard:** A Screen Tree annotated with journey steps.
> ```text
> App Navigation
> ├── Dashboard [Entry Point for Journey A]
> │   ├── Alert Widget (User taps here)
> │   └── ...
> └── Item Detail
>     ├── Price Display (User verifies match)
>     └── Buy Button (User completes action)
> ```

### Section 4: Key Entities & Data Model (Pass 3: System Grounding)
*The structural perspective.*

1.  **Entity Definitions:** High-level definitions of key nouns (e.g., "Order", "User", "Inventory"). List key relationships (1:N, M:N).
2.  **Journey Refinement (Pass 3):** Re-narrate the journeys as **state changes**.
    - When user clicks "Buy" (Pass 2), which Entity is created or modified?
    - Is there a "ghost action" that no entity stores? (Fix it now).
    - **Consistency Check:** Does Step 3 of the journey conflict with the data state left by Step 2?

> **Strategy:** Ensure every user action impacts a persistent model.
>
> **Output Standard:**
> - **Entity Graph:** `User --(places)--> Order --(contains)--> OrderItem`
> - **Journey Logic:** "Action: Buy Button -> Effect: Create Order (Status: Pending), Decrement Inventory (Lock Stock)."

### Section 5: Feature Index
A list of all functional modules, linking to their Level 2 PRDs.
- 1. Auth Module -> `v1_0_feat_auth.md`
- 2. Checkout Module -> `v1_0_feat_checkout.md`

---

## Level 2 · Feature PRD Structure

**File:** `docs/02_PRD/vX_Y_feat_name_...md`

A feature PRD is only "ready" when it passes the **Three-Layer Design Gate**:

### 1. User Flow (The Path)
- Entry point (referenced from Framework Screen Tree).
- Step-by-step interaction flow.
- Exit conditions (success/failure/cancel).

### 2. Frontend Specs (The Interface)
- **UI Structure:** Information hierarchy, component breakdown.
- **Interactions:** Input validation, loading states, error states.
- **Display Logic:** "If status is X, show Y."

### 3. Backend Logic (The Brain)
- **Data Operations:** precise CRUD operations on Entities defined in Framework.
- **State Machine:** State transition diagrams for relevant entities.
- **Edge Cases:** Network failure, concurrency, empty states.

---

## Multi-Feature PRD Structure

When a single PRD covers **multiple feature points** (e.g., a batch optimization PRD, a phase release covering several related changes), each feature point section MUST follow this internal structure:

### Per-Feature Section Template

```
### 需求 N：<Feature Title>

**问题**：<What specific problem this feature solves — the current pain point, stated concretely>

**背景**：<Why this problem exists, why it matters now, relevant business context>

**思路**：<High-level solution approach in 1-3 sentences — how we intend to solve it, before diving into details>

#### N.1 Detailed Rule / Sub-section
...
#### N.2 ...
```

### Rules

1. **"问题" comes first.** Never jump into solution details without stating the problem. The reader should understand *what's broken* before seeing the fix.
2. **"背景" provides context.** Why does this problem exist? What business situation makes it worth solving now? Link to historical decisions or data if available.
3. **"思路" bridges problem → solution.** A 1-3 sentence summary of the approach. The reader should be able to decide whether to read the detailed sub-sections based on this alone.
4. **Then detailed rules.** Only after the above three are established, proceed to the granular logic, tables, edge cases, etc.
5. **Each feature is self-contained.** A reader should be able to understand any single feature section without reading the others (though cross-references are fine).

### When to Use

- PRD has **≥ 3 feature points** in one document
- Features share a common theme but each has its own independent problem/solution
- Typical examples: "XX功能优化 PRD", "XX模块 Phase 2", "XX体验升级方案"

### Anti-patterns

- ❌ Jumping straight into "规则定义" without explaining why
- ❌ Writing "背景" only at the document level but not per feature — readers lose context when jumping to a specific section
- ❌ Mixing "思路" into the detailed rules — the high-level intent gets buried

---

## Annotation Handling

(Applies to all docs. See `SKILL.md` for full protocol.)

1.  **Identify:** Read `[批注]` or `[comment]`.
2.  **Discuss:** Propose solution in chat.
3.  **Confirm:** Wait for user approval.
4.  **Execute:** Update doc.
    - **Method A (In-place):** Convert to blockquote: `> [批注] ...`.
    - **Method B (New Version):** `v1_0` -> `v1_1`. Add header: `> Based on [批注] from v1_0`.

---

## PRD Writing Principles

1.  **Fractal Structure:** Framework PRD sets the pattern; Feature PRDs fill the details.
2.  **User First, Data Last:** Always design the experience (Screen Tree) before constraining it with storage (Entities).
3.  **Pain-Point Closure:** Every feature must trace back to a pain point in the Strategy doc.
