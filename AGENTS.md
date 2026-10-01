# Project-specific commands and information

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run seed` - Seed fake data to Firestore

## Project Structure
- Customer pages: `src/app/page.tsx` (home), `src/app/track/[id]/page.tsx` (tracking)
- Employee dashboard: `src/app/dashboard/page.tsx`
- Admin dashboard: `src/app/admin/page.tsx`
- Firebase config: `src/lib/firebase.ts`
- Business logic: `src/lib/orders.ts`, `src/lib/employees.ts`
- Constants: `src/config/constants.ts`
- Types: `src/types/database.ts`

## Important Notes
- This project uses Next.js 16 with App Router
- Firebase v12 for Authentication and Firestore
- Tailwind CSS for styling
- TypeScript for type safety
- Customers don't need authentication
- Employees and Admins need Firebase Authentication
- All write operations use server-side validation via Firestore transactions
- Payment system prepared for SePay webhook integration

## Firebase Setup
1. Copy `ENV_EXAMPLE.txt` to `.env.local` and fill in Firebase config
2. Deploy `firestore.rules` to Firebase Console
3. Deploy `firestore.indexes.json` to Firebase Console
4. Create users in Firebase Authentication that match emails in `employees` collection
5. Run `npm run seed` to populate fake data

## Security
- Firestore security rules allow public read access for order tracking
- Write operations are restricted to authenticated users
- Admin has full access
- Employees can only update their assigned orders
- Claim operations use transactions to prevent race conditions
- Payment transactions are checked for duplicates

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
