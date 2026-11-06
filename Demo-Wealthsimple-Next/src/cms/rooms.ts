/* The page's grounds, solved for contrast in light and dark by
   Demo-Wealthsimple/tools/solve-palette.mjs (css/tokens.css). An editor
   picks one by name; they cannot enter a colour that fails contrast. */
export const ROOMS = [
  { label: 'Spruce (deep blue-green)', value: 'spruce' },
  { label: 'Lichen (green-grey paper)', value: 'lichen' },
  { label: 'Petrol (muted mid-dark blue)', value: 'petrol' },
  { label: 'Olive (smoked olive)', value: 'olive' },
  { label: 'Oxblood (deep red-brown)', value: 'oxblood' },
  { label: 'Dawn (fog blue into wheat, gradient)', value: 'dawn' },
  { label: 'Fog (cool pale grey)', value: 'fog' },
  { label: 'Moss (pale lichen green)', value: 'moss' },
  { label: 'Peat (warm near-black)', value: 'peat' },
] as const

export type Room = (typeof ROOMS)[number]['value']

/* The five product pictures are drawn in code (src/app/(site)/pictures).
   Each can be used by one product. */
export const PICTURES = [
  { label: 'Credit: phone with a credit decision', value: 'credit' },
  { label: 'Governance: model card as a metal card', value: 'governance' },
  { label: 'Fraud: payments monitor and mule ring', value: 'fraud' },
  { label: 'Forecasting: cash forecast on a slab', value: 'forecasting' },
  { label: 'Risk: VaR donut before and after a hedge', value: 'risk' },
] as const

export type Picture = (typeof PICTURES)[number]['value']
