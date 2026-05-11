// Bank definitions with Brandfetch CDN logos
// Format: https://cdn.brandfetch.io/{domain}/w/128/h/128
export const BANKS = [
  // PH Digital Wallets / Neobanks
  { id: 'gcash',      name: 'GCash',        domain: 'gcash.com',         category: 'PH' },
  { id: 'gotyme',     name: 'GoTyme Bank',  domain: 'gotyme.com',        category: 'PH' },
  { id: 'maya',       name: 'Maya',         domain: 'maya.ph',           category: 'PH' },
  { id: 'seabank',    name: 'SeaBank',      domain: 'seabank.com.ph',    category: 'PH' },
  { id: 'tonik',      name: 'Tonik',        domain: 'tonikbank.com',     category: 'PH' },
  // PH Traditional Banks
  { id: 'bdo',        name: 'BDO',          domain: 'bdo.com.ph',        category: 'PH' },
  { id: 'bpi',        name: 'BPI',          domain: 'bpi.com.ph',        category: 'PH' },
  { id: 'metrobank',  name: 'Metrobank',    domain: 'metrobank.com.ph',  category: 'PH' },
  { id: 'unionbank',  name: 'UnionBank',    domain: 'unionbankph.com',   category: 'PH' },
  { id: 'landbank',   name: 'Landbank',     domain: 'landbank.com',      category: 'PH' },
  { id: 'pnb',        name: 'PNB',          domain: 'pnb.com.ph',        category: 'PH' },
  { id: 'rcbc',       name: 'RCBC',         domain: 'rcbc.com',          category: 'PH' },
  { id: 'securitybank', name: 'Security Bank', domain: 'securitybank.com', category: 'PH' },
  { id: 'chinabank',  name: 'China Bank',   domain: 'chinabank.ph',      category: 'PH' },
  // International
  { id: 'paypal',     name: 'PayPal',       domain: 'paypal.com',        category: 'International' },
  { id: 'wise',       name: 'Wise',         domain: 'wise.com',          category: 'International' },
  { id: 'revolut',    name: 'Revolut',      domain: 'revolut.com',       category: 'International' },
  { id: 'stripe',     name: 'Stripe',       domain: 'stripe.com',        category: 'International' },
  { id: 'ing',        name: 'ING',          domain: 'ing.com',           category: 'International' },
  { id: 'cash',       name: 'Cash',         domain: null,                category: 'Other' },
];

export function getBankLogo(domain) {
  if (!domain) return null;
  return `https://cdn.brandfetch.io/${domain}/w/128/h/128?c=1`;
}

export function getBankById(id) {
  return BANKS.find(b => b.id === id) || null;
}
