import { Features, PlanType, hasFeature } from '../shared/features';
import { ApiService } from './api.service';

export const SubscriptionService = {
  async getPlan(token?: string): Promise<PlanType> {
    const response = await ApiService.get<{ plan: PlanType }>('/subscription', token);
    return response.plan;
  },

  async refresh(token: string, setPlan: (plan: PlanType) => void): Promise<void> {
    const plan = await this.getPlan(token);
    setPlan(plan);
  },

  canUse(plan: PlanType, feature: Features): boolean {
    return hasFeature(plan, feature);
  }
};
