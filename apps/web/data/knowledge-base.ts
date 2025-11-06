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
    id: 'selling-basics',
    title: 'Selling basics',
    description:
      'Guides for onboarding new sellers, publishing listings, and fulfilling your first orders.',
  },
  {
    id: 'buyer-experience',
    title: 'Buyer experience',
    description: 'Everything shoppers need to know to checkout confidently and manage purchases.',
  },
  {
    id: 'trust-safety',
    title: 'Trust & safety',
    description:
      'Learn how we protect the marketplace, handle disputes, and keep your account secure.',
  },
  {
    id: 'payouts-taxes',
    title: 'Payouts & taxes',
    description:
      'Understand how money moves from buyer to seller and what information we need to stay compliant.',
  },
];

export const helpArticles: HelpArticle[] = [
  {
    slug: 'launch-your-first-listing',
    title: 'Launch your first listing',
    summary:
      'Create a polished product page with photography, smart pricing, and fulfillment details sellers need before publishing.',
    categoryId: 'selling-basics',
    readingTime: '6 min read',
    updatedAt: '2024-04-03',
    body: `## 1. Capture the essentials\n\nSuccessful listings start with clear information. Gather at least five high-quality images (1200px wide or larger), a descriptive title with searchable keywords, and a bullet list of standout features. If you are migrating from another marketplace, export the SKU data to stay consistent.\n\n> Tip: The photo carousel supports background removal. Upload contrast-friendly images to let the tool work best.\n\n## 2. Set transparent pricing\n\nOpen the pricing panel to define: \n\n- *Base price* — the amount a buyer pays before taxes and shipping.\n- *Quantity* — the number of units in stock.\n- *Offer settings* — toggle \`Allow offers\` if you are open to negotiation.\n\nThe smart pricing widget suggests a range based on similar listings sold in the last 30 days. Adjust the slider until your profit margin lands within your target.\n\n## 3. Choose fulfillment and policies\n\nBuyers feel confident when shipping, returns, and warranties are spelled out. Select a default shipping profile or connect a carrier account for live rates. If you accept returns, specify the time window and who covers shipping.\n\n## 4. Preview before you publish\n\nUse the \`Preview listing\` action to experience the page like a buyer. Double-check mobile layouts, recommended accessories, and trust badges. When everything looks right, hit **Publish**. The marketplace feed updates in under a minute.`,
  },
  {
    slug: 'buyer-protection-program',
    title: 'How the buyer protection program works',
    summary:
      'Understand what happens from checkout through delivery, including coverage windows and how to file a claim.',
    categoryId: 'buyer-experience',
    readingTime: '5 min read',
    updatedAt: '2024-03-27',
    body: `## What is covered\n\nEvery checkout automatically includes buyer protection at no extra cost. We cover: \n\n- Items not received within the estimated delivery window.\n- Items that arrive damaged, significantly different from the description, or missing components.\n- Unauthorized transactions reported within 60 days.\n\n## How to submit a claim\n\n1. Open **Dashboard → Purchases** and locate the order.\n2. Click **Report an issue** and choose the reason.\n3. Upload supporting photos or shipping documents.\n4. Submit the claim. Our support team responds within two business days.\n\n## Resolution timeline\n\nWe immediately place the seller payout on hold. Most cases close in five to seven business days after both parties respond. If we approve the claim, we refund the buyer and help the seller arrange return shipping or relisting guidance.\n\n## Staying in good standing\n\nSellers who keep valid tracking and respond quickly rarely see disputes escalate. Buyers should message sellers before opening a claim—many shipping mishaps resolve with a quick update.`,
  },
  {
    slug: 'secure-your-account',
    title: 'Secure your account with multi-factor authentication',
    summary:
      'Protect your login with authenticator apps, backup codes, and automated alerts that keep attackers out.',
    categoryId: 'trust-safety',
    readingTime: '4 min read',
    updatedAt: '2024-02-16',
    body: `## Turn on MFA in minutes\n\nHead to **Dashboard → Security** and click **Enable multi-factor authentication**. Scan the QR code with your preferred authenticator app (Authy, 1Password, or Google Authenticator all work). Enter the six-digit code to confirm setup.\n\n## Store your backup codes\n\nWe generate 10 one-time codes. Save them in a password manager or print and store them securely. If you lose your phone, these codes let you access your account without waiting for support.\n\n## Add login alerts\n\nToggle email and push notifications for new device logins. Each alert includes device fingerprint and approximate location. If an alert looks suspicious, revoke the session directly from the email.\n\n## Need to reset MFA?\n\nSubmit a verification request from the login screen. We will ask for identity proof (government ID and a selfie) to make sure the account owner is requesting the change.`,
  },
  {
    slug: 'payout-schedule',
    title: 'Understand the payout schedule',
    summary:
      'See how funds move from captured payments to your bank account and what delays a disbursement.',
    categoryId: 'payouts-taxes',
    readingTime: '7 min read',
    updatedAt: '2024-04-09',
    body: `## Standard payout timeline\n\n| Event | Timeframe | Details |\n| --- | --- | --- |\n| Order placed | Day 0 | We authorize the buyer's card and notify you. |\n| Order fulfilled | Day 1–3 | Mark the order as shipped and provide tracking. |\n| Buyer confirms delivery | Day 3–14 | Automatic if the carrier marks the package delivered. |\n| Payout released | Day 4–15 | Funds move to your pending balance. |\n| Deposit initiated | Same day | ACH transfer starts before 6pm local time. |\n| Bank receives funds | +1 business day | Timing depends on your bank's clearing cutoffs. |\n\n## Reasons a payout might pause\n\n- First sale on a new account (one-time 7 day review).\n- Missing tax forms (W-9/W-8BEN) or identity verification.\n- A dispute opened on the order.\n- Negative account balance due to refunds or chargebacks.\n\n## Improve cash flow\n\nLink a verified bank account, enable automatic tax form reminders, and keep order defect rate below 1%. You can also request early access to Express Payouts (fee applies) once you complete 10 successful orders.`,
  },
  {
    slug: 'resolving-order-disputes',
    title: 'Resolving order disputes collaboratively',
    summary:
      'Walk through the joint buyer-seller workflow for resolving issues before support has to step in.',
    categoryId: 'trust-safety',
    readingTime: '5 min read',
    updatedAt: '2024-03-05',
    body: `## Start with a conversation\n\nOpen the order in **Dashboard → Messages** and choose a pre-built prompt such as *\"Package delayed\"* or *\"Incorrect item sent\"*. This gives both parties a shared thread and timeline.\n\n## Share proof quickly\n\nUpload photos, receipts, or carrier correspondence directly to the thread. Both sides can react to updates, so it is clear when a message has been read.\n\n## Agree on a path forward\n\nUse the **Resolve issue** button to choose between refund, replacement, or store credit. The platform records the decision, schedules return shipping if needed, and updates payouts automatically.\n\nIf the conversation stalls for more than 48 hours, escalate to support. We review the thread, apply marketplace policies, and close the case within two business days.`,
  },
];

export const faqs: FaqEntry[] = [
  {
    question: 'How do I verify my identity as a seller?',
    answer:
      'Head to **Dashboard → Settings → Identity**. Upload a government-issued ID and a selfie. Verification typically completes within 10 minutes during business hours.',
  },
  {
    question: 'Can I connect an existing Shopify or Etsy catalog?',
    answer:
      'Yes. Use the catalog importer located in **Dashboard → Integrations**. We map core fields automatically and flag anything that needs manual review before publishing.',
  },
  {
    question: 'What payment methods do buyers see at checkout?',
    answer:
      'We support major credit and debit cards, Apple Pay, Google Pay, and installment plans through Possible Pay Later in eligible regions.',
  },
  {
    question: 'Do you charge listing fees?',
    answer:
      'No listing fees. We collect a 7% marketplace service fee when an order completes. Payment processing fees vary by region and payment method.',
  },
  {
    question: 'How are taxes calculated?',
    answer:
      'Possible Website automatically calculates sales tax based on ship-to address and your nexus settings. Sellers can review tax breakdowns per order in the analytics dashboard.',
  },
];

export const policies: PolicyDocument[] = [
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    summary:
      'Defines your contractual relationship with Possible Website, including acceptable use and account responsibilities.',
    lastUpdated: '2024-04-01',
    body: `## 1. Agreement to terms\n\nBy creating an account or using Possible Website you agree to these Terms, our Privacy Notice, and any product-specific guidelines. If you act on behalf of a company, you represent that you have authority to bind it.\n\n## 2. Marketplace eligibility\n\nTo sell on Possible Website you must:\n\n1. Be at least 18 years old or the age of majority in your jurisdiction.\n2. Provide accurate identity, tax, and payout information.\n3. Keep your account in good standing with an order defect rate below 2%.\n\nWe may suspend or terminate accounts that violate policies, engage in fraudulent activity, or present safety risks.\n\n## 3. Fees and payments\n\nWe charge service and payment processing fees as posted in your seller dashboard. By processing transactions through Possible Website you authorize us to debit and credit your connected bank accounts as required to settle balances, refunds, or chargebacks.\n\n## 4. Content and licensing\n\nYou retain ownership of content you upload but grant Possible Website a worldwide, royalty-free license to host, display, and promote your listings. You are responsible for ensuring you have rights to any media you submit.\n\n## 5. Limitation of liability\n\nPossible Website is not liable for indirect, incidental, or consequential damages. Our aggregate liability under these Terms will not exceed the total fees you paid in the three months preceding the claim.`,
  },
  {
    slug: 'privacy-notice',
    title: 'Privacy Notice',
    summary:
      'Explains what data we collect, why we collect it, and the controls you have over your personal information.',
    lastUpdated: '2024-03-20',
    body: `## Data we collect\n\n- Account details such as name, email, phone number, and profile imagery.\n- Transaction records including orders, payouts, refunds, and dispute history.\n- Usage analytics like device identifiers, IP addresses, and session events.\n- Communications with buyers and support.\n\n## How we use your data\n\nWe process data to operate the marketplace, fulfill legal obligations, detect fraud, personalize experiences, and communicate product updates. When legally required, we obtain consent before using personal data for marketing.\n\n## Sharing and retention\n\nWe share data with payment processors, shipping partners, identity verification providers, and analytics vendors who help us run the platform. We retain data as long as your account is active or as needed to meet legal requirements.\n\n## Your choices\n\nYou can download an account archive, request deletion, or opt out of marketing emails at any time from **Dashboard → Privacy**. Certain financial records must remain for regulatory compliance.`,
  },
  {
    slug: 'seller-code-of-conduct',
    title: 'Seller Code of Conduct',
    summary:
      'Outlines the professional standards every seller must follow to maintain a trusted marketplace.',
    lastUpdated: '2024-02-11',
    body: `## Keep promises to buyers\n\nShip orders by the handling time you set, provide valid tracking, and respond to messages within one business day.\n\n## List accurately\n\nDescribe items honestly, disclose condition issues, and use your own photography whenever possible. Counterfeit or unsafe goods are strictly prohibited.\n\n## Communicate respectfully\n\nHarassment, hate speech, or retaliatory feedback manipulation results in immediate suspension. Keep all order-related conversations on-platform so we can assist if problems arise.\n\n## Cooperate with investigations\n\nWhen support needs documentation, respond promptly. Provide receipts, photos, or serial numbers within the requested window to keep cases moving.\n\n## Mind compliance obligations\n\nMaintain up-to-date tax information and comply with regional regulations for restricted product categories (for example, electronics or cosmetics).`,
  },
];
