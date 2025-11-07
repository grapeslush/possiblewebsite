import { UserRole } from '@prisma/client';

export const DEMO_PASSWORD_HASH = '$2b$12$iZeUn9q.rGOB7AxQX8DSpu5mDazT8Jf5GjKpPYIipCBFNOwaw35si';

export type PolicyAcceptanceSeed = {
  slug: string;
  version: string;
};

export type UserSeed = {
  id?: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  stripeCustomerId?: string;
  stripeConnectId?: string;
  marketingOptIn?: boolean;
  policies: PolicyAcceptanceSeed[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export const ADMIN_USER: UserSeed = {
  email: 'admin@possible.tackle',
  displayName: 'Avery Lake (Admin)',
  role: UserRole.ADMIN,
  bio: 'Marketplace operations lead for Possible Tackle Exchange.',
  phoneNumber: '+1-512-555-0114',
  avatarUrl: 'https://avatars.githubusercontent.com/u/9710123?v=4',
  marketingOptIn: true,
  policies: [
    { slug: 'marketplace-terms-of-service', version: '2024.06' },
    { slug: 'age-and-consent', version: '2024.04' },
  ],
};

export const SUPPORT_USER: UserSeed = {
  email: 'support@possible.tackle',
  displayName: 'Jordan Pike (Support)',
  role: UserRole.SUPPORT,
  bio: 'Dispute response specialist and compliance liaison.',
  phoneNumber: '+1-737-555-0182',
  avatarUrl: 'https://avatars.githubusercontent.com/u/9923145?v=4',
  policies: [
    { slug: 'marketplace-terms-of-service', version: '2024.06' },
    { slug: 'age-and-consent', version: '2024.04' },
  ],
};

export const SELLER_SEEDS: UserSeed[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'demo-seller@possible.tackle',
    displayName: 'Lena Rivera Outfitters',
    role: UserRole.SELLER,
    bio: 'Guide service consignment shop specializing in frog gear and swimbaits.',
    phoneNumber: '+1-214-555-0199',
    avatarUrl:
      'https://images.unsplash.com/photo-1521579770076-52b57bf4f42e?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_lena',
    stripeConnectId: 'acct_demo_lena',
    marketingOptIn: true,
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
      { slug: 'seller-trust-and-safety', version: '2024.06' },
    ],
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
  },
  {
    email: 'smallbatch@possible.tackle',
    displayName: 'Small Batch Swimbaits',
    role: UserRole.SELLER,
    bio: 'Hand-poured glide baits and limited run hardware curated weekly.',
    phoneNumber: '+1-405-555-0133',
    avatarUrl:
      'https://images.unsplash.com/photo-1516567727245-40002f73ac7f?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_smallbatch',
    stripeConnectId: 'acct_demo_smallbatch',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
      { slug: 'seller-trust-and-safety', version: '2024.06' },
    ],
    city: 'Tulsa',
    state: 'OK',
    postalCode: '74103',
    country: 'US',
  },
  {
    email: 'deckhand-supply@possible.tackle',
    displayName: 'Deckhand Supply Co.',
    role: UserRole.SELLER,
    bio: 'Boat electronics and rigging upgrades for serious weekend anglers.',
    phoneNumber: '+1-731-555-0120',
    avatarUrl:
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_deckhand',
    stripeConnectId: 'acct_demo_deckhand',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
      { slug: 'seller-trust-and-safety', version: '2024.06' },
    ],
    city: 'Knoxville',
    state: 'TN',
    postalCode: '37902',
    country: 'US',
  },
  {
    email: 'heritage-rods@possible.tackle',
    displayName: 'Heritage Rod & Reel',
    role: UserRole.SELLER,
    bio: 'Vintage rebuilds and tournament loaner rods with modern components.',
    phoneNumber: '+1-704-555-0152',
    avatarUrl:
      'https://images.unsplash.com/photo-1534082753658-1dcb40afc5ab?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_heritage',
    stripeConnectId: 'acct_demo_heritage',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
      { slug: 'seller-trust-and-safety', version: '2024.06' },
    ],
    city: 'Charlotte',
    state: 'NC',
    postalCode: '28202',
    country: 'US',
  },
  {
    email: 'bayou-tech@possible.tackle',
    displayName: 'Bayou Tech Angling',
    role: UserRole.SELLER,
    bio: 'Inshore electronics and shallow water anchor specialists.',
    phoneNumber: '+1-985-555-0187',
    avatarUrl:
      'https://images.unsplash.com/photo-1512427691650-1e0c10fff0c2?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_bayou',
    stripeConnectId: 'acct_demo_bayou',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
      { slug: 'seller-trust-and-safety', version: '2024.06' },
    ],
    city: 'Houma',
    state: 'LA',
    postalCode: '70360',
    country: 'US',
  },
  {
    email: 'northwoods@possible.tackle',
    displayName: 'Northwoods Outfitters',
    role: UserRole.SELLER,
    bio: 'Upper Midwest smallmouth and musky tackle co-op.',
    phoneNumber: '+1-715-555-0149',
    avatarUrl:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_northwoods',
    stripeConnectId: 'acct_demo_northwoods',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
      { slug: 'seller-trust-and-safety', version: '2024.06' },
    ],
    city: 'Duluth',
    state: 'MN',
    postalCode: '55802',
    country: 'US',
  },
];

export const BUYER_SEEDS: UserSeed[] = [
  {
    email: 'verified-buyer@possible.tackle',
    displayName: 'Maya Chen',
    role: UserRole.BUYER,
    bio: 'Kayak angler testing finesse combos and AI recommendations.',
    phoneNumber: '+1-415-555-0128',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
    stripeCustomerId: 'cus_demo_maya',
    marketingOptIn: true,
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
    ],
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    country: 'US',
  },
  {
    email: 'boat-tour@possible.tackle',
    displayName: 'Chris Holloway',
    role: UserRole.BUYER,
    bio: 'Traveling tournament co-angler evaluating electronics bundles.',
    phoneNumber: '+1-913-555-0177',
    stripeCustomerId: 'cus_demo_chris',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
    ],
    city: 'Kansas City',
    state: 'MO',
    postalCode: '64108',
    country: 'US',
  },
  {
    email: 'weekend-grass@possible.tackle',
    displayName: 'Tariq Johnson',
    role: UserRole.BUYER,
    bio: 'Weekend grass mat frogger building a curated loadout.',
    phoneNumber: '+1-305-555-0115',
    stripeCustomerId: 'cus_demo_tariq',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
    ],
    city: 'Miami',
    state: 'FL',
    postalCode: '33101',
    country: 'US',
  },
  {
    email: 'suspending-baits@possible.tackle',
    displayName: 'Arielle Dupont',
    role: UserRole.BUYER,
    bio: 'Great Lakes jerkbait fanatic providing AI feedback loops.',
    phoneNumber: '+1-248-555-0164',
    stripeCustomerId: 'cus_demo_arielle',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
    ],
    city: 'Detroit',
    state: 'MI',
    postalCode: '48226',
    country: 'US',
  },
  {
    email: 'river-smallie@possible.tackle',
    displayName: 'Jonas Meyer',
    role: UserRole.BUYER,
    bio: 'Upper Mississippi river smallmouth chaser focused on finesse rods.',
    phoneNumber: '+1-608-555-0158',
    stripeCustomerId: 'cus_demo_jonas',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
    ],
    city: 'La Crosse',
    state: 'WI',
    postalCode: '54601',
    country: 'US',
  },
  {
    email: 'salt-ready@possible.tackle',
    displayName: 'Gabriela Ortiz',
    role: UserRole.BUYER,
    bio: 'Inshore angler testing crossover tackle with AI shipping guidance.',
    phoneNumber: '+1-904-555-0172',
    stripeCustomerId: 'cus_demo_gabriela',
    policies: [
      { slug: 'marketplace-terms-of-service', version: '2024.06' },
      { slug: 'age-and-consent', version: '2024.04' },
    ],
    city: 'Jacksonville',
    state: 'FL',
    postalCode: '32202',
    country: 'US',
  },
];
