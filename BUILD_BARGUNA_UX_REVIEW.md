# Build Barguna (বিল্ড বরগুনা) — Comprehensive UX Review

**Platform:** Bangladeshi Halal Investment Platform  
**Primary Use Case:** Mobile (most users)  
**Persona Reviewing:** Sally, UX Designer (user-centric, accessibility-focused)

---

## Executive Summary

Build Barguna is a well-structured halal investment app with thoughtful localization and clear functionality. However, there are **significant mobile UX gaps**, **information clarity issues**, and **accessibility concerns** that will frustrate users and likely increase support requests. The good news: many fixes are quick wins.

---

## 1. Navigation & Information Architecture ⭐ Good Foundation, Minor Issues

### Strengths
- ✅ Logical sidebar structure with clear separation: member nav vs admin nav
- ✅ Consistent Bengali labeling throughout
- ✅ Dashboard acts as a good hub with quick action cards
- ✅ Mobile menu toggle shows awareness of mobile constraints

### Issues

**1.1 Sidebar Bloat on Admin Accounts**
- Admins see **16 nav items** (8 member + 8 admin). On mobile, this becomes a scroll-heavy menu.
- No visual hierarchy to indicate "I'm in admin mode" vs "member mode"
- **Impact:** Admin users get lost switching contexts

**1.2 Navigation Lacks Breadcrumbs**
- Users can deep-link to ProjectDetail, MyInvestments, etc., but there's no breadcrumb trail showing where they are
- Back button is manually implemented in ProjectDetail only — not consistent elsewhere
- **Impact:** Cognitive load; users don't know how to retrace steps

**1.3 Info Architecture Mismatch: Portfolio vs MyInvestments**
- `MyInvestments` shows: your share portfolio + purchase requests (pending/approved/rejected)
- `Portfolio` page (referenced but content not shown) shows ROI analytics
- **Problem:** Users may not understand the difference and visit the wrong page
- **Impact:** Low discoverability of portfolio analytics

### Recommendations
1. **Admin mode indicator** – Add a subtle badge/color change to sidebar header when in admin mode
2. **Add breadcrumbs** to key pages (Projects > Project Detail, Dashboard > Portfolio, etc.)
3. **Merge clarity** – In MyInvestments, add a small help text: "View full analytics on Portfolio page →"
4. **Mobile: Collapse admin nav** – Hide admin items in a separate "Admin" collapsible section on mobile

---

## 2. Visual Hierarchy & Clarity 🎨 Inconsistent; Needs Refinement

### Strengths
- ✅ Good use of color-coded disclaimers (green=halal, orange=risk, blue=referral, amber=withdrawal)
- ✅ Card-based layouts are clean
- ✅ Font sizing is generally readable

### Issues

**2.1 Disclaimer Overload**
- **Projects page:** 2 disclaimers shown (halal + investment-risk compact)
- **ProjectDetail page:** Same 2 disclaimers repeated in the form section
- **MyInvestments page:** Same 2 disclaimers repeated again
- **Problem:** Users see the same disclaimers 10+ times navigating the app
- **Impact:** Disclaimer fatigue → users ignore them (legal risk for you)

**2.2 Mixed Signal on Visual Emphasis**
- Buy button on Projects card: standard blue → doesn't signal urgency
- "Share exhausted" state: disabled button with `opacity-50` → too subtle, users might miss it
- ProjectDetail: Total amount calculation shown in small text inside a light box → easy to miss
- **Impact:** Users miss critical information (remaining shares, total cost)

**2.3 Status Badges Are Unclear**
- MyInvestments purchase requests show: `pending` / `approved` / `rejected` with colored badges
- **Missing context:** What does "pending" mean? How long? Will I be notified?
- Earnings page doesn't show status (assumes all are credited) — inconsistent pattern
- **Impact:** Anxiety about transaction status

**2.4 Data Density Problems**
- Withdraw page: **4 balance cards** in a row on mobile → cramped, hard to tap
- Dashboard referral stats: **3 stat cards** squeezed together
- **Impact:** Small touch targets (especially problematic in Bangladesh where many users have older phones/lower dexterity)

### Recommendations
1. **Disclaimer Strategy:**
   - Show full disclaimers ONLY on first visit or in a Help/Terms section
   - On subsequent pages, use a single compact banner: "Read our halal & risk terms →" (link)
   - OR: Show disclaimer once per session, then replace with a mini icon toggle

2. **Emphasize Key Actions:**
   - "Exhausted shares" button → change to red/desaturated red with strikethrough text
   - Total amount in ProjectDetail → move to prominent orange/accent box
   - Pending status → add "⏳ Waiting for approval" with timeline estimate

3. **Status Transparency:**
   - Add helper text under pending requests: "Usually approved within 24 hours"
   - Add "last updated: 2 hours ago" to balance cards
   - Show notification icon when status changes (integrate with local push if possible)

4. **Reduce Data Density:**
   - On mobile, change 4-column grids to 2-column
   - Use tabs or collapsibles for less-critical info
   - Example: Dashboard withdrawal card could collapse "pending" detail

---

## 3. Mobile UX (Primary Use Case) 📱 **CRITICAL GAPS**

### Strengths
- ✅ Responsive grid system (1→2→3 columns)
- ✅ Mobile menu toggle in header
- ✅ Input placeholders use Bengali

### Critical Issues

**3.1 Sidebar Menu Doesn't Close on Link Click (LG)**
```tsx
onClick={() => setMenuOpen(false)}  // Only on Links, not on parent clicks
```
- When a user clicks a nav link on mobile, sidebar closes ✅
- BUT: When user taps overlay (dark area), sidebar doesn't close ❌
- **Impact:** User must tap menu icon again to close or click a link

**3.2 Touch Targets Too Small**
- Nav links: `py-2.5` (10px) = 36-40px height → borderline, acceptable
- Form inputs: `input` class assumes default height — needs verification it's 44px min
- Copy buttons in Referrals: `py-1.5 px-3` = ~32px → **below 44px guideline**
- **Impact:** Frustration on older Android devices; failed taps

**3.3 Form UX on Mobile**
- **ProjectDetail buy form:** 
  - Quantity input: `type="number"` → gives phone keyboard (good!)
  - BUT: No visible +/- stepper → users must type or hunt for keyboard buttons
  - Total amount shows in small text → easy to misread
  
- **Withdraw form:**
  - Amount input: `type="number"` with currency symbol prefix — currency symbol not in input ❌
  - Prefix symbol `৳` is positioned absolutely, can be hidden by keyboard on small screens
  - bKash number: no visual masking (shows raw `01712345678` in history)

- **Register form:**
  - Phone input has pattern validation ✅ good
  - **BUT:** No phone formatter (doesn't auto-space `01712345678` → `0171 234 5678`)
  - Password field: no strength indicator for a financial app

**3.4 Keyboard Doesn't Dismiss**
- ProjectDetail/Withdraw: After entering amount, keyboard stays open
- No "Done" button or auto-dismiss on valid input
- **Impact:** Users can't see the total amount or submit button; must manually dismiss

**3.5 Scroll Position Not Preserved**
- Projects list: User scrolls to project #8, clicks detail, goes back → scrolls to top
- User loses place, must re-scroll
- **Impact:** Friction when browsing multiple projects

**3.6 No Loading Skeleton State**
- Referrals page shows spinning loader but freezes UI
- Dashboard shows success but queries are async — might flash "undefined" values
- **Impact:** Janky, unfinished feel

**3.7 Confirmation Modal for High-Value Actions**
- Withdraw page: Has good confirmation modal ✅
- ProjectDetail: No confirmation before submitting share purchase ❌ (should confirm amount + txid)
- **Impact:** Accidental purchases

### Recommendations (Mobile Priority)

1. **Fix sidebar overlay:** Make overlay click close the menu
2. **Improve touch targets:**
   ```tsx
   // Minimum 44x44px for all interactive elements
   <button className="py-3 px-4 min-h-11">...</button>
   ```
3. **Add phone formatter:**
   ```tsx
   <input value={phone} 
     onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} />
   ```
4. **Keyboard dismissal:**
   - Use `onBlur` to hide keyboard after form submission
   - Add "Done" button on numeric inputs
5. **Input spinners for quantity:**
   - Replace `<input type="number">` with custom +/- buttons (better mobile UX)
6. **Preserve scroll state:**
   - Use React Router's `scroll-to-top` addon or manual state management
7. **Add skeletons:**
   ```tsx
   {isLoading ? <Skeleton /> : <Content />}
   ```
8. **Confirm high-value transactions:**
   - ProjectDetail: Show confirmation modal before submitting
   - Amount, shares, txid preview

---

## 4. Forms & Input UX 📝 Good Validation, Missing Polish

### Strengths
- ✅ Register: Real-time referral code validation (600ms debounce) is smart
- ✅ Phone input has pattern validation
- ✅ Error messages appear inline
- ✅ Disabled states on buttons when form invalid

### Issues

**4.1 Referral Code Validation**
- Shows spinner while checking ✅
- Shows ✓ on success ✅
- **BUT:** Spinner text: "যাচাই করা হচ্ছে..." might not be visible on slow networks (no timeout)
- If API hangs, spinner loops forever

**4.2 Missing Input Feedback**
- ProjectDetail quantity input: No visual feedback when exceeding max (`max={p.available_shares}`)
- Submit button disables but no error message
- **Better:** Show red text: "Only X shares available"

- Withdraw amount input: Shows validation error ONLY if user manually submits
- As they type, no feedback if amount exceeds balance
- **Better:** Real-time red text when invalid

**4.3 Password Field Weak Validation**
- Register: `minLength={6}` only — no strength indicator
- Users might create weak passwords (`123456`, `aaaaaa`)
- **Impact:** Security risk for financial accounts

**4.4 Missing Context in Forms**
- bKash TxID input: Says "যেমন: 8N4K2M..." but users don't know TxID format
- Should show: "Find in bKash app → Activity → transaction details"
- Phone number placeholder: "01XXXXXXXXX" but doesn't explain operator codes (013, 017, etc.)

**4.5 Form Submission States**
- All forms show loading text: "জমা হচ্ছে..." ✅
- **BUT:** No visual spinner (just text) → could look like button is stuck
- Should add spinner icon or disable input while submitting

### Recommendations

1. **Add timeout to validation spinner:**
   ```tsx
   {refChecking && <Spinner />}
   {!refChecking && refValid === null && <p>রেফারেল কোড দিন</p>}
   ```

2. **Real-time input validation:**
   ```tsx
   {amountTaka && amountPaisa > balance.available_paisa && (
     <p className="text-red-500 text-xs">সর্বোচ্চ {formatTaka(balance.available_paisa)} পর্যন্ত</p>
   )}
   ```

3. **Password strength indicator:**
   ```tsx
   <PasswordStrength value={password} />  // Shows bars: Weak/Fair/Strong
   ```

4. **Add help text to critical fields:**
   - "bKash TxID: খুঁজুন bKash অ্যাপ > লেনদেন ইতিহাস"
   - "ফোন নম্বর: ০১X দিয়ে শুরু করুন (013-019 যেকোনো অপারেটর)"

5. **Add spinner to submit button:**
   ```tsx
   <button disabled={isPending}>
     {isPending ? (
       <>
         <Spinner className="inline mr-2" size={16} />
         জমা হচ্ছে...
       </>
     ) : 'জমা দিন'}
   </button>
   ```

---

## 5. Feedback & Loading States 🔄 Inconsistent

### Issues

**5.1 Success Messages Disappear**
- ProjectDetail: `setMsg(...)` appears, user reads, then... it stays forever (or they navigate away)
- Withdraw: Success message has a close button ✅ but Referrals doesn't
- **Inconsistency:** User expects close button everywhere

**5.2 No Toast Notifications**
- Referrals: "Copied to clipboard" feedback is local state (`setCopied(true)` → 2s timeout)
- Works but feels fragile (no visual toast, just text change)
- **Better:** Use a toast library for consistency

**5.3 Loading Skeletons Missing**
- Dashboard: Queries are async but no loading state shown → page looks done then updates
- Referrals: Shows spinning circle (good) but freezes page interaction
- **Better:** Show skeleton cards while loading

**5.4 Error States Lack Recovery**
- Referrals error state: Shows "রেফারেল তথ্য লোড করা যায়নি" with refresh button ✅
- BUT: Other pages (Projects, MyInvestments) show generic "লোড হচ্ছে..." indefinitely if API fails
- **Impact:** User thinks app is broken, doesn't know to try again

**5.5 Withdrawal History Expansion is Hidden**
- Cards expand on click to show details (great UX!)
- **BUT:** No visual affordance (chevron icon is small, subtle text)
- Users might not realize details are hidden

### Recommendations

1. **Auto-dismiss success messages after 4-5 seconds:**
   ```tsx
   useEffect(() => {
     if (msg) {
       const timer = setTimeout(() => setMsg(''), 4000);
       return () => clearTimeout(timer);
     }
   }, [msg]);
   ```

2. **Add toast library (react-hot-toast):**
   ```tsx
   toast.success('শেয়ার কেনার অনুরোধ জমা হয়েছে!');
   ```

3. **Add skeleton loaders:**
   ```tsx
   {isLoading ? <SkeletonCard /> : <ProjectCard />}
   ```

4. **Improve error handling:**
   ```tsx
   {isError && (
     <div className="card bg-red-50">
       <p>ডেটা লোড করতে ব্যর্থ</p>
       <button onClick={() => refetch()}>আবার চেষ্টা করুন</button>
     </div>
   )}
   ```

5. **Improve chevron affordance:**
   - Make expanded/collapsed state more visible
   - Show background color change on expand
   - Add subtle "tap to see details" text on first visit only

---

## 6. Disclaimer/Trust UX ⚖️ **Overcommunicated, Legally Risky**

### Current State
- 4 disclaimer variants: halal, referral, withdrawal, investment-risk
- Shown on almost every page
- Users see same disclaimers 10+ times

### Issues

**6.1 Disclaimer Fatigue (Legal Risk)**
- Research shows users ignore repeated disclaimers
- **Legal problem:** If investment goes wrong, "they saw it" doesn't hold if they saw it 20 times and ignored it
- **Impact:** Lower legal protection despite good intentions

**6.2 Compact Mode Defeats Purpose**
- Compact disclaimers show only the first bullet point
- Users don't read the full implications
- Example: Halal disclaimer in compact mode only shows: "সম্পূর্ণ ইসলামিক শরিয়াহ নীতি অনুযায়ী"
- Users miss: "প্রজেক্টে লোকসান হলে শেয়ার অনুপাতে লোকসানের ভাগও বহন করতে হবে"

**6.3 Placement Is Weak**
- Disclaimers appear AFTER users see the attractive product (projects, earnings)
- **Better:** Show before user engages
- Users are more likely to read if they appear first

**6.4 No Terms of Service / Confirmation Flow**
- Register page: No ToS checkbox ("I agree to terms")
- ProjectDetail: No explicit investment risk checkbox
- Withdraw: Has confirmation modal but not a legal acknowledgment
- **Legal gap:** Can't prove user understood risks

### Recommendations (Legal + UX)

1. **Replace Disclaimer Spam with Smart System:**
   - Show FULL disclaimers on: Register, First Investment, First Withdrawal
   - Add checkboxes: "☑ I understand this is a partnership (musharaka), not guaranteed returns"
   - Use local storage to skip on subsequent visits: `localStorage.setItem('halal-understood', true)`

2. **Move Disclaimers Higher:**
   - Register: Add ToS checkbox at bottom → "I agree to the Halal Investment Terms"
   - Projects: Add disclaimer banner at the TOP before showing projects
   - ProjectDetail: Show risk disclaimer in a modal on FIRST visit to buy form

3. **Make Compact Mode Honest:**
   - Compact should show BOTH key points, not just first:
     ```tsx
     halal: {
       points: [
         '✅ সম্পূর্ণ ইসলামিক শরিয়াহ নীতি',
         '⚠️ লোকসান হলে অংশ বহন করবেন'
       ]
     }
     ```

4. **Track Disclaimer Acknowledgment:**
   - Store in user profile: `{disclaimers_accepted: {halal: true, risk: true, ...}, accepted_at: '2024-01-15'}`
   - Helps with legal defense

5. **Add Expandable/Collapse System:**
   - Instead of full disclaimer visible, show toggle: "ⓘ হালাল বিনিয়োগের শর্ত (সম্প্রসারণ করুন)"
   - Prevents overwhelming UI while allowing users to verify details

---

## 7. Accessibility Concerns ♿ **Moderate Issues**

### Issues

**7.1 Color Alone for Status**
- Withdraw status badges use color: yellow=pending, blue=approved, green=completed, red=rejected
- Colorblind users can't distinguish
- **Fix:** Add icons (already done!) but also add text labels (already done!)
- **Status:** Actually fine ✅

**7.2 Icon Reliance**
- Sidebar nav: Icons + text ✅ good
- Status badges: Icons + text ✅ good
- BUT: Referral "How it Works" uses numbered circles — might be too small for low vision
  ```tsx
  <span className="...rounded-full w-7 h-7...">১</span>  // 28px circle
  ```

**7.3 Missing alt Text**
- Project images: `<img src={p.image_url} alt={p.title}` ✅ has alt
- BUT: Sidebar icons are decorative (no alt needed)
- BUT: Copy button icons have no aria-label

**7.4 Form Labels**
- All inputs have `<label className="label">` ✅ great
- BUT: Labels not associated with inputs via `htmlFor`
  ```tsx
  <label className="label">পূর্ণ নাম</label>
  <input className="input" type="text" ... />  // ❌ No id/for association
  ```
- **Impact:** Screen reader doesn't link label to input

**7.5 Button Semantics**
- "Back" button in ProjectDetail uses `<button onClick={() => navigate(-1)}>` ✅
- BUT: Copy buttons use `<button onClick={copyCode}>` with no type attribute
- Should be `<button type="button">` to prevent form submission

**7.6 Color Contrast**
- Main text on white: ✅ Good
- Disabled button text: `opacity-50` on gray → contrast might be low
- Need to verify with accessibility checker

**7.7 Skip Links**
- No skip navigation link (jump to main content)
- Less critical for mobile but good practice

### Recommendations

1. **Associate labels with inputs:**
   ```tsx
   <label htmlFor="phone" className="label">মোবাইল নম্বর</label>
   <input id="phone" className="input" type="tel" ... />
   ```

2. **Add aria-labels to icon buttons:**
   ```tsx
   <button onClick={copyCode} aria-label="রেফারেল কোড কপি করুন">
     <Copy size={14} /> কপি করুন
   </button>
   ```

3. **Verify color contrast:**
   - Run through WebAIM Contrast Checker
   - Ensure disabled buttons meet AA standard

4. **Button type attributes:**
   ```tsx
   <button type="button" onClick={handleAction}>Action</button>
   ```

5. **Increase interactive element size for low vision:**
   - Referral step circles: `w-8 h-8` instead of `w-7 h-7`

---

## 8. Quick Wins (Easy Fixes, High Impact) ⚡

### Priority 1 (Do Today)
1. **Fix sidebar overlay click** → 5 min, huge mobile UX improvement
2. **Add close button to success messages** → 5 min, consistency win
3. **Fix label-input associations** → 10 min, accessibility win
4. **Confirm before share purchase** → 15 min, prevents accidents
5. **Show real-time validation in Withdraw amount** → 10 min, less frustration

### Priority 2 (This Sprint)
6. **Add phone number formatter** → 10 min, polish
7. **Keyboard dismissal on form submit** → 10 min, mobile UX
8. **Reduce disclaimer frequency** → 30 min, legal + UX
9. **Add spinner to submit buttons** → 15 min, better feedback
10. **Improve touch target sizes** → 20 min, mobile accessibility

### Priority 3 (Next Sprint)
11. **Add skeleton loaders** → 45 min, polish
12. **Breadcrumb navigation** → 30 min, clarity
13. **Admin mode indicator** → 15 min, clarity
14. **Scroll position preservation** → 20 min, friction reduction

---

## 9. Bigger Improvements (Bigger Impact, More Work) 🚀

### 9.1 Referral Code Education
**Current:** Users see referral code and share link but don't understand why/how
**Solution:**
- Add short onboarding video or GIF showing share flow
- Show "1 friend invested → you earned ৳X" examples
- Add "How much can I earn?" calculator

**Impact:** Higher referral conversion

### 9.2 Withdrawal Friction Reduction
**Current:** Withdrawal requires bKash number input, confirmation modal, API call
**Gaps:**
- No saved bKash numbers (user types every time)
- No instant feedback on transaction status
- 3-7 day wait time not validated against real SKY bank infrastructure

**Solution:**
- Save 2-3 bKash numbers for quick access
- Add real-time push notifications for withdrawal status changes
- Partner with bKash for instant validation of phone number

**Impact:** Reduced support requests, higher completion rate

### 9.3 Investment Education Flows
**Current:** Users see projects but might not understand:
- What "shares" mean in Islamic context
- How profit distribution works
- What happens if project fails

**Solution:**
- Add "Before you invest" education:
  - Short video: "What is Musharaka?" (2 min)
  - FAQ: "Can I lose my money?" 
  - Example: "If project makes 100,000 taka profit, how much do I get?"
- Add project detail explanations (location, developer, timeline)

**Impact:** Fewer bad investment decisions, higher trust

### 9.4 Portfolio Visualization
**Current:** Dashboard shows ROI% but users don't understand trajectory
**Solution:**
- Add mini chart showing earnings over 6 months
- Show "annualized return" vs actual monthly variance
- Add "compare to savings rate" context (e.g., "This project returned 12% vs 5% bank savings")

**Impact:** Better decision-making, higher confidence

### 9.5 Mobile App (Native)
**Current:** Responsive web app is good for MVP
**Reality:** Bangladesh has high mobile adoption; native app expectations are rising
**Solution:**
- Build React Native version (share logic with web)
- Add home screen widget showing balance
- Add offline support (show cached data if connection drops)
- Add biometric login (fingerprint)

**Impact:** 30-50% higher engagement (industry standard)

### 9.6 Multi-Language Support (Future)
**Current:** Bengali only (excellent for primary market!)
**Consider:** English option for foreign investors or documentation
**Solution:**
- Use i18n library (react-i18next)
- Keep Bengali as default, English as secondary
- Localizes disclaimers to legal requirements by country

**Impact:** Opens international market (future)

---

## 10. Summary: What to Fix First

| Category | Issue | Effort | Impact | Fix Now? |
|---|---|---|---|---|
| Mobile UX | Sidebar overlay doesn't close | 5 min | High | ✅ Yes |
| Mobile UX | Touch targets too small | 20 min | High | ✅ Yes |
| Forms | No confirmation on share purchase | 15 min | High | ✅ Yes |
| Disclaimers | Shown too many times | 30 min | High | ✅ Yes |
| Forms | Real-time withdraw validation | 10 min | Medium | ✅ Yes |
| Feedback | Success messages inconsistent | 10 min | Medium | ✅ Yes |
| Accessibility | Label-input association | 10 min | Medium | ✅ Yes |
| Mobile UX | Keyboard doesn't dismiss | 15 min | Medium | ✅ Yes |
| Visual | Data density on cards | 20 min | Medium | Next sprint |
| Navigation | Breadcrumbs missing | 30 min | Medium | Next sprint |
| Mobile UX | Scroll position not preserved | 20 min | Low | Later |
| Loading | Skeleton screens | 45 min | Low | Later |

---

## Final Thoughts

Build Barguna has **solid UX foundations** — good information architecture, thoughtful Bengali localization, and clear business logic. The app doesn't feel broken; it feels **unpolished and slightly overprotective** (disclaimer spam).

**For users in Bangladesh**, the biggest friction points are:
1. **Mobile experience** feels like a web app, not a native experience
2. **Trust is strong** (disclaimers work!) but **overdone** (legal liability increases)
3. **Forms feel safe** but **lack guidance** on what to do next
4. **Navigation feels clear** but **lacks context** when jumping between pages

**If I were a first-time user:**
- I'd register smoothly ✅
- I'd browse projects but feel overwhelmed by disclaimers ⚠️
- I'd buy a share but wish I had confirmation ❌
- I'd check earnings easily ✅
- I'd try to withdraw but struggle with bKash number entry ❌
- I'd share my referral code but not understand the value ❌

**Recommendation:** Focus next sprint on mobile polish + disclaimer consolidation. These two fixes alone will dramatically improve the experience and reduce support burden.

---

**Review prepared by Sally, UX Designer**  
*Prioritizing user clarity, mobile accessibility, and trust through honest communication.*
