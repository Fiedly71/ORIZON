// Web stub for @stripe/stripe-react-native
// Stripe native SDK is not available on web. The mobile app should use
// Stripe.js (separate package) for web payments. For now we noop.

const noop = () => null;
const asyncNoop = async () => ({ error: { message: 'Stripe not available on web' } });

export const StripeProvider = ({ children }) => children;
export const CardField = noop;
export const useStripe = () => ({
  initPaymentSheet: asyncNoop,
  presentPaymentSheet: asyncNoop,
  confirmPayment: asyncNoop,
  createPaymentMethod: asyncNoop,
});
export const useConfirmPayment = () => ({ confirmPayment: asyncNoop, loading: false });
export const initStripe = asyncNoop;

export default {
  StripeProvider,
  CardField,
  useStripe,
  useConfirmPayment,
  initStripe,
};
