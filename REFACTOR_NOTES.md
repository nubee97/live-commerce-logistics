# Refactor Notes

## What changed in this pass

### 1) Large page files reduced to thin page shells
- `src/pages/Dashboard.jsx` now acts as a composition shell around `useDashboardWorkspace`.
- `src/pages/OrderList.jsx` now acts as a composition shell around `useOrderListWorkspace`.
- `src/pages/Orders.jsx` now acts as a composition shell around `useOrdersWorkspace`.

### 2) Business logic moved out of pages into feature hooks/services
#### Dashboard
- `src/features/dashboard/useDashboardWorkspace.js`
- `src/features/dashboard/dashboard-data-service.js`
- `src/features/dashboard/dashboard-view-model.js` (moved from `src/pages/dashboard-utils.js`)
- `src/features/dashboard/DashboardImportInputs.jsx`

#### Orders
- `src/features/orders/useOrdersWorkspace.js`
- `src/features/orders/orders-service.js`
- `src/features/orders/orders-domain.js`
- `src/features/orders/orders-form-utils.js` (moved from `src/pages/order-utils.js`)
- `src/features/orders/OrdersHeroSection.jsx`

#### Order List
- `src/features/order-list/useOrderListWorkspace.js`
- `src/features/order-list/order-list-service.js`

### 3) Style centralization
All active style imports are now centralized in:
- `src/styles/index.css`

Removed scattered CSS imports from page/layout/component files and moved them into one predictable import order.

### 4) `app.css` split into smaller files
The old monolithic `src/styles/app.css` was removed and split into:
- `src/styles/base/foundation.css`
- `src/styles/auth/auth-pages.css`
- `src/styles/legacy/shell-operations.css`
- `src/styles/legacy/orders-workspace.css`
- `src/styles/legacy/ops-pages.css`

### 5) Naming consistency improvements
- UI files stay as `.jsx` feature components.
- Business logic is now grouped into `use*.js`, `*-service.js`, `*-domain.js`, and `*-view-model.js` files.
- Moved utility files out of `src/pages/` when they were not page UI.

## Size reduction snapshot
- `src/pages/Dashboard.jsx`: 507 -> 57 lines
- `src/pages/OrderList.jsx`: 428 -> 66 lines
- `src/pages/Orders.jsx`: 666 -> 111 lines

## Validation
- `npm run lint -- --max-warnings=0` ✅
- `npm run build` ✅

## Notes
- Features and CSS were preserved.
- The final Vite build succeeds, though it still warns that the JS bundle is large. That is a performance/code-splitting opportunity, not a broken build.
