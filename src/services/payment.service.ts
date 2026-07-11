import { ApiService } from './api.service';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentService = {
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if (window.Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  },

  async createOrder(planId: string, token: string): Promise<any> {
    const order = await ApiService.post<any>('/payment/create-order', { plan: planId }, token);
    return order;
  },

  async verifyPayment(paymentDetails: any, token: string): Promise<any> {
    return await ApiService.post('/payment/verify', paymentDetails, token);
  },

  async openRazorpayCheckout(order: any, token: string, user: any): Promise<boolean> {
    if (order.orderId && order.key) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const returnUrl = encodeURIComponent(window.location.href);
      const checkoutUrl = baseUrl + '/checkout?orderId=' + order.orderId + '&amount=' + order.amount + '&key=' + order.key + '&token=' + token + '&returnUrl=' + returnUrl;
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: checkoutUrl });
      } else {
        window.open(checkoutUrl, '_blank', 'width=500,height=700,left=100,top=100');
      }
      
      // We will now poll the backend to check if the plan has been updated to PRO.
      // This is because the payment happens in a different tab/window.
      return new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const meResponse = await ApiService.get<any>('/auth/me', token);
            if (meResponse && (meResponse.plan === 'PRO' || meResponse.plan === 'MAX')) {
              clearInterval(interval);
              resolve(true);
            }
          } catch (e) {
            // ignore
          }
          if (attempts > 60) { // 2 minutes max
            clearInterval(interval);
            resolve(false);
          }
        }, 2000);
      });
    }
    return false;
  }
};
