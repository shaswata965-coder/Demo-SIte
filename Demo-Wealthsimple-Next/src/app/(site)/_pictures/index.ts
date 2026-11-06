import type { ComponentType } from 'react'

import type { Picture } from '@/cms/rooms'

import { CreditPicture } from './Credit'
import { ForecastingPicture } from './Forecasting'
import { FraudPicture } from './Fraud'
import { GovernancePicture } from './Governance'
import { CreditIcon, ForecastingIcon, FraudIcon, GovernanceIcon, RiskIcon } from './icons'
import { RiskPicture } from './Risk'

/* What the CMS's "picture" choice draws: the looping product screen behind
   the section and the icon beside the name in the product menu. */
export const PICTURES: Record<Picture, { Picture: ComponentType; Icon: ComponentType }> = {
  credit: { Picture: CreditPicture, Icon: CreditIcon },
  governance: { Picture: GovernancePicture, Icon: GovernanceIcon },
  fraud: { Picture: FraudPicture, Icon: FraudIcon },
  forecasting: { Picture: ForecastingPicture, Icon: ForecastingIcon },
  risk: { Picture: RiskPicture, Icon: RiskIcon },
}
