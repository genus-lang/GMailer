import { Controller, Get, Header, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('checkout')
  @Header('Content-Type', 'text/html')
  getCheckoutPage(
    @Query('orderId') orderId: string,
    @Query('amount') amount: string,
    @Query('key') key: string,
    @Query('token') token: string,
    @Query('returnUrl') returnUrl: string,
  ): string {
    const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GMailer+ Secure Checkout</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #09090b;
            color: #fafafa;
            font-family: 'Inter', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, rgba(147, 51, 234, 0.15) 0%, transparent 50%);
        }
        .container {
            text-align: center;
            background: rgba(24, 24, 27, 0.6);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            width: 90%;
            animation: fadeIn 0.8s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .loader {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(79, 70, 229, 0.3);
            border-radius: 50%;
            border-top-color: #4f46e5;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 24px auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 12px 0;
            background: linear-gradient(to right, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #a1a1aa;
            font-size: 15px;
            line-height: 1.5;
            margin: 0 0 24px 0;
        }
        .status {
            font-size: 14px;
            color: #10b981;
            font-weight: 500;
            display: none;
            padding: 12px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }
    </style>
</head>
<body>
    <div class="container" id="loading-container">
        <div class="loader"></div>
        <h1>Preparing Secure Checkout</h1>
        <p>Please wait while we connect you to Razorpay.<br>A secure payment window will open shortly.</p>
    </div>
    
    <div class="container status" id="success-container">
        <svg style="width:48px;height:48px;margin:0 auto 16px;color:#10b981;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h1 style="-webkit-text-fill-color:#10b981;">Payment Successful!</h1>
        <p style="margin-bottom:0;">Redirecting you back to GMailer+...</p>
    </div>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
        setTimeout(() => {
            const options = {
                key: "${key}",
                amount: "${amount}",
                currency: "INR",
                name: "GMailer+",
                description: "Upgrade to GMailer+ Pro Plan",
                order_id: "${orderId}",
                config: {
                    display: {
                        blocks: {
                            upi: {
                                name: "Pay via UPI",
                                instruments: [
                                    { method: "upi" }
                                ]
                            },
                            other: {
                                name: "Other Payment Modes",
                                instruments: [
                                    { method: "card" },
                                    { method: "netbanking" },
                                    { method: "wallet" }
                                ]
                            }
                        },
                        sequence: ["block.upi", "block.other"]
                    }
                },
                handler: async function (response) {
                    document.getElementById('loading-container').style.display = 'none';
                    document.getElementById('success-container').style.display = 'block';
                    
                    try {
                        await fetch('/payment/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ${token}'
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        
                        // Wait briefly so user sees the success screen
                        setTimeout(() => {
                            window.close();
                            // In case window.close() is blocked by browser, change text
                            document.querySelector('#success-container p').innerText = "Payment complete! You can safely close this tab and return to the GMailer extension.";
                        }, 2000);
                    } catch (e) {
                        console.error(e);
                    }
                },
                theme: {
                    color: "#4f46e5"
                },
                modal: {
                    ondismiss: function() {
                        // User closed the modal
                        document.querySelector('#loading-container h1').innerText = "Payment Cancelled";
                        document.querySelector('#loading-container p').innerText = "You may close this window.";
                        document.querySelector('.loader').style.display = 'none';
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert("Payment failed: " + response.error.description);
            });
            rzp.open();
        }, 1000);
    </script>
</body>
</html>
    `;
  }
}
