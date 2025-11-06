export type HelpCategory = {
  id: string;
  title: string;
  description: string;
};

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  body: string;
  updatedAt: string;
  readingTime: string;
};

export type FaqEntry = {
  question: string;
  answer: string;
};

export type PolicyDocument = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  lastUpdated: string;
};

export const helpCategories: HelpCategory[] = [
  {
    id: 'sell-your-gear',
    title: 'Sell your tackle',
    description:
      'Guides for cleaning, photographing, and pricing rods, reels, and bundles before you publish.',
  },
  {
    id: 'buy-with-confidence',
    title: 'Buy with confidence',
    description:
      'What anglers should expect from escrow, inspections, and delivery updates on Tackle Exchange.',
  },
  {
    id: 'safety-and-escrow',
    title: 'Safety & escrow',
    description:
      'Understand our verification process, dispute playbooks, and how we keep trades fair.',
  },
  {
    id: 'payouts-and-compliance',
    title: 'Payouts & compliance',
    description:
      'Everything about deposits, service fees, and the tax info required for annual reporting.',
  },
];

export const helpArticles: HelpArticle[] = [
  {
    slug: 'prep-your-tackle-kit',
    title: 'Prep your tackle kit for a fast sale',
    summary:
      'Clean, stage, and document your gear so buyers know exactly what they are getting before they place an offer.',
    categoryId: 'sell-your-gear',
    readingTime: '6 min read',
    updatedAt: '2024-05-22',
    body: `## 1. Rinse, repair, and record\n\nGive rods and reels a freshwater rinse, replace chipped guides, and spool down line that is past its prime. Snap a photo of any cosmetic blemishes—transparency keeps your seller score high.\n\n## 2. Shoot on a flat surface\n\nLay everything on a clean deck or table with neutral lighting. Include close-ups of reel seats, drag knobs, and bait hooks so buyers can zoom in. When listing bundles, group items by technique (for example, finesse spinning, offshore jigging).\n\n## 3. Publish with specifics\n\nEnter model numbers, gear ratios, and lure weight ranges so our search and compatibility tools can make smart matches. Tag your listing with lake or region intel if it has a history anglers might care about.\n\n## 4. Ship like a pro\n\nOnce the order clears escrow, pack rods in a rigid tube, lock reels, and add padding around lure boxes. Print the prepaid label from your dashboard so tracking syncs automatically.`,
  },
  {
    slug: 'buyer-inspection-checklist',
    title: 'Inspection checklist for buyers',
    summary:
      'Use this two-day window to confirm your new-to-you tackle performs as promised before releasing funds from escrow.',
    categoryId: 'buy-with-confidence',
    readingTime: '5 min read',
    updatedAt: '2024-05-18',
    body: `## When your shipment arrives\n\n1. Record an unboxing video before removing bubble wrap.\n2. Inspect reel handles, drag stacks, and bail arms for smooth movement.\n3. Check rod guides with a cotton swab—snags signal hidden cracks.\n4. Inventory lure trays and accessories against the listing photos.\n\n## Need to flag an issue?\n\nUse **Dashboard → Purchases → Start inspection** to upload photos and notes. We freeze the escrow clock while support reviews. Most clarifications resolve with replacement lures or a partial refund within 48 hours.\n\n## Keep your reputation sharp\n\nIf everything looks great, release escrow early to boost your buyer reliability score. Verified buyers get access to limited-drop listings and early alerts from top sellers.`,
  },
  {
    slug: 'escrow-protection-overview',
    title: 'How Tackle Exchange escrow protects every trade',
    summary:
      'See how funds move from checkout through inspection, and why sellers love our fraud monitoring.',
    categoryId: 'safety-and-escrow',
    readingTime: '4 min read',
    updatedAt: '2024-05-10',
    body: `## Step-by-step\n\n- **Checkout:** Buyers authorize payment, but we hold it in a segmented escrow wallet.\n- **Shipment:** Sellers print marketplace labels so we can verify tracking and insurance.\n- **Inspection:** Buyers get two full days after delivery scans.\n- **Release:** Funds deposit automatically unless a case is opened.\n\n## Safeguards\n\nRisk signals (duplicate photos, serial mismatches, abrupt price swings) trigger manual review by our tackle experts. Disputes route through a single thread so all context is logged for future reference.`,
  },
  {
    slug: 'payout-timing-and-fees',
    title: 'Payout timing, fees, and forms',
    summary:
      'Understand when deposits hit your bank, what our 8% catch-and-release fee covers, and the tax docs we send each winter.',
    categoryId: 'payouts-and-compliance',
    readingTime: '7 min read',
    updatedAt: '2024-05-02',
    body: `## Standard payout cadence\n\n| Event | Timeline | Details |\n| --- | --- | --- |\n| Order confirmed | Day 0 | Buyer pays into escrow. |\n| Tracking scanned | Day 1–3 | Seller ships with marketplace label. |\n| Inspection complete | Day 3–5 | Escrow releases automatically unless paused. |\n| Deposit initiated | Same day | ACH transfer begins before 7pm local time. |\n| Bank receives funds | +1 business day | Dependent on bank clearing. |\n\n## Fees explained\n\nOur 8% service fee funds payment processing, fraud reviews, and dedicated tackle specialists. Carriers charge separate shipping and insurance rates based on tube length and weight.\n\n## Tax forms\n\nWe collect W-9 or W-8BEN details during onboarding. Once you cross IRS thresholds, 1099-K forms post in **Dashboard → Documents** each January.`,
  },
  {
    slug: 'resolving-gear-disputes',
    title: 'Resolve gear disputes without breaking trust',
    summary:
      'Follow this playbook when an item arrives damaged or missing parts so we can get both anglers back on the water.',
    categoryId: 'safety-and-escrow',
    readingTime: '5 min read',
    updatedAt: '2024-05-12',
    body: `## Start with context\n\nOpen the order thread and choose a prompt like *"Guide wraps cracked"* or *"Electronics DOA"*. Upload proof, including the unboxing video.\n\n## Pick a resolution\n\nUse **Resolve issue** to select refund, replacement, or repair credit. Our system auto-calculates shipping labels for returns or exchanges.\n\n## When we step in\n\nIf messages stall for more than 48 hours, escalate to Tackle Exchange support. We review footage, serial numbers, and inspection logs before issuing a decision that protects escrow for the right party.`,
  },
];

export const faqs: FaqEntry[] = [
  {
    question: 'How do I become a verified tackle seller?',
    answer:
      'Complete **Dashboard → Settings → Verification** with a government ID, a recent utility bill, and at least one listing video walk-through. Our tackle specialists approve most submissions within one business day.',
  },
  {
    question: 'What shipping supplies do you recommend for rods?',
    answer:
      'Use a rigid rod tube or PVC pipe with foam inserts at both ends. We partner with carriers that honor our damage waiver when you print the prepaid label from Tackle Exchange.',
  },
  {
    question: 'Which payment methods work with escrow?',
    answer:
      'We accept major cards, Apple Pay, Google Pay, and Tackle Exchange Gift Credits. All options route funds into the same escrow ledger until inspections finish.',
  },
  {
    question: 'What is the service fee for sellers?',
    answer:
      'Sellers pay an 8% catch-and-release fee on completed orders. There are no listing fees or penalties for price edits before you accept an offer.',
  },
  {
    question: 'How does sales tax work?',
    answer:
      'Tackle Exchange calculates destination-based sales tax automatically using your nexus profile. You can download transaction-level tax summaries anytime from the analytics dashboard.',
  },
];

export const policies: PolicyDocument[] = [
  {
    slug: 'terms-of-trade',
    title: 'Terms of Trade',
    summary:
      'Defines your relationship with Tackle Exchange, including acceptable listings, escrow rules, and account expectations.',
    lastUpdated: '2024-05-01',
    body: `## 1. Agreement to terms\n\nBy creating a Tackle Exchange account you agree to these Terms, our Privacy Policy, and any listing-specific guidelines. If you register on behalf of a guide service or shop, you confirm you have authority to bind that business.\n\n## 2. Marketplace eligibility\n\nTo sell on Tackle Exchange you must be at least 18, maintain accurate identity, tax, and payout info, and keep your order defect rate below 2%. We may pause or terminate accounts that post counterfeit gear, fail to ship, or otherwise endanger community trust.\n\n## 3. Fees and payments\n\nYou authorize us to debit and credit your connected bank account for escrow releases, refunds, and chargebacks. Service fees are disclosed before you accept an offer.\n\n## 4. Content rights\n\nYou retain ownership of the photos, videos, and descriptions you upload. You grant Tackle Exchange a worldwide, royalty-free license to host and promote that content for marketplace operations.\n\n## 5. Liability\n\nWe are not liable for indirect or consequential damages arising from trades. Our total liability under these Terms will not exceed the fees you paid in the three months preceding a claim.`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    summary:
      'Explains the data we collect to operate the marketplace, fight fraud, and personalize the tackle experience.',
    lastUpdated: '2024-04-28',
    body: `## Data we collect\n\n- Account details such as name, email, phone, and preferred fisheries.\n- Transaction records including listings, offers, shipments, disputes, and payout history.\n- Device and usage analytics like IP addresses, session logs, and error reports.\n- Support conversations and inspection media.\n\n## How we use data\n\nWe process information to power listing discovery, manage escrow, comply with legal obligations, and surface relevant tackle recommendations. Marketing messages require your consent, which you can withdraw anytime.\n\n## Sharing and retention\n\nWe share data with payment processors, shipping carriers, identity verification partners, and analytics vendors under strict contracts. We retain data while your account remains active and as needed for legal and tax requirements.\n\n## Your choices\n\nDownload account archives, request deletion, and manage marketing preferences via **Dashboard → Privacy**. Some financial records must remain for compliance even after deletion.`,
  },
  {
    slug: 'seller-code',
    title: 'Seller Code of Conduct',
    summary:
      'Sets expectations for honest listings, safe packaging, and respectful communication between anglers.',
    lastUpdated: '2024-04-15',
    body: `## Ship on time\n\nConfirm orders within 24 hours, use approved carriers, and upload tracking so buyers can follow their gear home.\n\n## Describe accurately\n\nDisclose repairs, aftermarket mods, or rust spots. Photos must be your own and represent the actual item in hand.\n\n## Communicate with respect\n\nKeep all trade messages inside Tackle Exchange so we can help if problems arise. Harassment, hate speech, or retaliation through reviews is prohibited.\n\n## Cooperate with reviews\n\nIf support requests documentation (receipts, serial numbers, videos) respond within two business days. Delay may result in refunds from your pending balance.\n\n## Follow local regulations\n\nStay compliant with state and federal rules governing knives, electronics, or other regulated tackle categories.`,
  },
];
