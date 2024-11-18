const zarinpalConfig = 
   {
    MERCHANT_ID: process.env.ZARINPAL_MERCHANT_ID,
    SANDBOX: process.env.NODE_ENV !== 'production',
    CALLBACK_URL: process.env.PAYMENT_CALLBACK_URL,
    API_URLS: {
      SANDBOX: {
        REQUEST: 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json',
        VERIFY: 'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentVerification.json',
        START: 'https://sandbox.zarinpal.com/pg/StartPay/',
      },
      PRODUCTION: {
        REQUEST: 'https://api.zarinpal.com/pg/v4/payment/request.json',
        VERIFY: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
        START: 'https://www.zarinpal.com/pg/StartPay/',
      }
    }
  };
  module.exports = zarinpalConfig