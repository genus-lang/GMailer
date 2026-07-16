import { ApiService } from './api.service';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentService = {


  async createOrder(planId: string, token: string): Promise<any> {
    const order = await ApiService.post<any>('/payment/create-order', { plan: planId }, token);
    return order;
  },

  async verifyPayment(paymentDetails: any, token: string): Promise<any> {
    return await ApiService.post('/payment/verify', paymentDetails, token);
  },

  async openCashfreeCheckout(order: any, token: string, user: any, popup?: Window | null): Promise<boolean> {
    if (order.orderId && order.paymentSessionId) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const returnUrl = encodeURIComponent(window.location.href);
      // We pass the paymentSessionId in the 'key' parameter to the backend checkout route
      const checkoutUrl = baseUrl + '/checkout?orderId=' + order.orderId + '&amount=' + order.amount + '&key=' + order.paymentSessionId + '&token=' + token + '&returnUrl=' + returnUrl;
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: checkoutUrl });
        if (popup) popup.close(); // Close the blank popup if we successfully used chrome.tabs
      } else if (popup) {
        popup.location.href = checkoutUrl;
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
