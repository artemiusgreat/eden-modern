'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadStripe, type Stripe, type StripeElements, type StripeElement, type StripeElementsOptionsMode } from '@stripe/stripe-js';
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBBtn,
  MDBSpinner,
} from 'mdb-react-ui-kit';
import { useCart } from '@/components/cart/CartProvider';
import AddressAutocomplete, { type ParsedAddress } from '@/components/AddressAutocomplete';
import { cartLineToGaItem, minorToDecimal, trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { decodeEntities } from '@/lib/format';
import type { StoreCart } from '@/lib/woo';
import type {
  CheckoutAddress,
  CheckoutResponse,
  CheckoutShippingPackage,
  CheckoutShippingRate,
} from '@/lib/woo-cart';
import styles from './CheckoutView.module.css';

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const COUNTRIES: [string, string][] = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'],
  ['AU', 'Australia'], ['NZ', 'New Zealand'], ['DE', 'Germany'], ['FR', 'France'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['NL', 'Netherlands'], ['BE', 'Belgium'],
  ['CH', 'Switzerland'], ['AT', 'Austria'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['DK', 'Denmark'], ['FI', 'Finland'], ['PT', 'Portugal'], ['GR', 'Greece'],
  ['PL', 'Poland'], ['CZ', 'Czechia'], ['HU', 'Hungary'], ['RO', 'Romania'],
  ['IL', 'Israel'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'],
  ['IN', 'India'], ['SG', 'Singapore'], ['MY', 'Malaysia'], ['JP', 'Japan'],
  ['KR', 'South Korea'], ['ZA', 'South Africa'], ['BR', 'Brazil'], ['MX', 'Mexico'],
];

const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'Credit / debit card',
  'stripe_klarna': 'Klarna',
  'stripe_affirm': 'Affirm',
  'stripe_afterpay_clearpay': 'Afterpay',
};

/**
 * Stripe-only checkout: the merchant uses Stripe exclusively. Instead of a
 * blocklist of PayPal sub-gateway IDs (which broke when the PayPal Payments
 * plugin changed its ID format — raw IDs like "ppcp axo gateway" leaked
 * through), only Stripe gateway IDs are shown. Any current or future
 * non-Stripe method is excluded automatically.
 */
function isStripeMethod(id: string): boolean {
  return id === 'stripe' || id.startsWith('stripe_');
}

/**
 * Detect whether the selected gateway is a Stripe UPE gateway. Returns the
 * payment method type(s) for Stripe gateways ('stripe' -> ['card'],
 * 'stripe_klarna' -> ['klarna'], …), null for non-Stripe gateways.
 * NOTE: The return value is used ONLY for gateway detection (whether to mount
 * the Payment Element and use the confirmation-token flow). The Element itself
 * runs in automatic mode (no paymentMethodTypes) to match the backend's
 * Dynamic Payment Methods behavior.
 * Returns null for non-Stripe gateways (no Element for those).
 */
function stripeUpeTypes(gatewayId: string): string[] | null {
  if (gatewayId === 'stripe') return ['card'];
  if (gatewayId.startsWith('stripe_')) return [gatewayId.slice('stripe_'.length)];
  return null;
}

const emptyAddress = (country = 'US'): CheckoutAddress => ({
  first_name: '', last_name: '', company: '', address_1: '', address_2: '',
  city: '', state: '', postcode: '', country, email: '', phone: '',
});

/** Full totals as the cart endpoint returns them (StoreCart's type is a subset). */
interface CartTotalsFull {
  total_items: string;
  total_shipping: string | null;
  total_tax: string;
  total_discount: string;
  total_price: string;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_prefix: string;
  currency_suffix: string;
}

/** Cart endpoint shape including shipping rates (source of truth for rates/totals). */
interface CartWithRates extends StoreCart {
  shipping_rates: CheckoutShippingPackage[];
  has_calculated_shipping: boolean;
}

/** Headless product URL for a cart line, via the Store API permalink slug. */
function lineProductUrl(item: { permalink?: string }): string | null {
  const slug = item.permalink?.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
  return slug ? `/products/${slug}` : null;
}

function money(minor: string | null | undefined, t: CartTotalsFull) {
  if (minor === null || minor === undefined) return '—';
  const v = (parseInt(minor, 10) || 0) / Math.pow(10, t.currency_minor_unit);
  return `${t.currency_prefix}${v.toFixed(2)}${t.currency_suffix}`;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

/** Native labeled field — explicit dark-theme styles, no MDB cascade fights. */
function Field({
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </div>
  );
}

export default function CheckoutView() {
  const { cart, removeItem, updateQuantity, busy } = useCart();
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Live cart snapshot from update-customer / select-shipping-rate responses —
  // the cart endpoint (not the checkout draft) is the source of truth for
  // shipping rates and totals.
  const [liveCart, setLiveCart] = useState<CartWithRates | null>(null);
  const cartData = liveCart ?? (cart as CartWithRates | null);

  // Bag edits from the order summary (the standalone bag page is gone).
  // Drop the live snapshot first so the freshly-mutated provider cart —
  // with recalculated rates and totals — becomes the source of truth again.
  const changeQty = (key: string, quantity: number) => {
    setLiveCart(null);
    updateQuantity(key, quantity);
  };
  const removeLine = (key: string) => {
    setLiveCart(null);
    removeItem(key).catch(() => null);
  };
  const totals = cartData ? (cartData.totals as unknown as CartTotalsFull) : null;

  const [email, setEmail] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [ship, setShip] = useState<CheckoutAddress>(() => emptyAddress());
  const [billSame, setBillSame] = useState(true);
  const [bill, setBill] = useState<CheckoutAddress>(() => emptyAddress());
  const [note, setNote] = useState('');

  const [ratesReady, setRatesReady] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);
  const [shipExpanded, setShipExpanded] = useState(false);
  const [billExpanded, setBillExpanded] = useState(false);
  const [selectedRates, setSelectedRates] = useState<Record<number, string>>({});
  const [payMethod, setPayMethod] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElRef = useRef<StripeElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  /** Show an error at the top of the form and scroll it into view. */
  function showError(msg: string) {
    setError(msg);
    window.setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  const loadCheckout = useCallback(async () => {
    // Only payment methods + saved addresses come from the checkout draft;
    // rates/totals are read from the cart endpoint (see liveCart).
    // NOTE: after a failed payment the Store API keeps a draft order in the
    // session and GET /checkout answers with __experimentalCart: null
    // (order-based response path), so every access below must tolerate null.
    const data = (await api('/api/checkout')) as CheckoutResponse;
    setCheckout(data);
    return data;
  }, []);

  useEffect(() => {
    loadCheckout()
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // __experimentalCart is null when the session holds a draft order from a
  // previous (failed) payment attempt — the Store API answers GET /checkout
  // with the order-based response then. The cart endpoint always lists
  // payment_methods, so it is the fallback; without it the payment section
  // would render empty and the shopper could not retry.
  const cartPaymentMethods =
    (cartData as unknown as { payment_methods?: string[] } | null)?.payment_methods;
  const needsShipping = checkout?.__experimentalCart?.needs_shipping ?? true;
  const paymentMethods = (
    checkout?.__experimentalCart?.payment_methods ?? cartPaymentMethods ?? []
  ).filter(isStripeMethod);

  // No payment method is preselected: the shopper picks one explicitly, and
  // the Stripe Payment Element only mounts on that explicit choice — after
  // page load, when cart totals and Stripe.js have settled. (Preselecting
  // 'stripe' on page load caused intermittent mount failures: the Element
  // could get stuck at its skeleton or never mount depending on load timing.)
  const packages = cartData?.shipping_rates ?? [];

  // (Re)build the Stripe Payment Element when a Stripe payment method is selected.
  // The Element is NOT rebuilt when totals or rates change — recalculating
  // shipping must not wipe entered card details; the amount syncs via
  // elements.update() in the effect below. Only a method change rebuilds.
  const builtForRef = useRef<string>('');
  useEffect(() => {
    let cancelled = false;
    async function build() {
      // The Element mounts for any Stripe gateway; the collected types follow
      // the shopper's selection via stripeUpeTypes(), never a hardcoded list.
      const upeTypes = stripeUpeTypes(payMethod);
      if (!upeTypes || !stripePromise || !totals || !cardMountRef.current) {
        // Leaving Stripe for another method: tear down the Element.
        if (!upeTypes && paymentElRef.current) {
          paymentElRef.current.destroy();
          paymentElRef.current = null;
          elementsRef.current = null;
          builtForRef.current = '';
        }
        return;
      }
      // Already have a healthy Element for this method — don't tear it down.
      if (builtForRef.current === payMethod && paymentElRef.current) return;
      try {
        const stripe = await stripePromise;
        if (cancelled) return;
        if (!stripe) {
          // loadStripe() resolved null: js.stripe.com was blocked (ad/privacy
          // blocker) or failed to load. Tell the shopper instead of leaving
          // an empty box.
          console.error('Stripe.js failed to load (stripe is null).');
          showError('Card payments could not be loaded. Please disable any ad blocker for this site or try another payment method.');
          return;
        }
        stripeRef.current = stripe;
        paymentElRef.current?.destroy();
        paymentElRef.current = null;
        const elements = stripe.elements({
          mode: 'payment',
          amount: parseInt(totals.total_price, 10) || 0,
          currency: totals.currency_code.toLowerCase(),
          // paymentMethodTypes is intentionally OMITTED (automatic mode): the
          // Stripe Gateway's Dynamic Payment Methods update creates the
          // PaymentIntent with automatic_payment_methods (not explicit
          // payment_method_types), and Stripe rejects an explicit-mode
          // confirmation token against it. stripeUpeTypes() above is still
          // used for gateway detection (whether to mount the Element).
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#c9a35f',
              colorBackground: '#121b2e',
              colorText: '#f2f2f2',
              colorDanger: '#e0655f',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '3px',
            },
          },
        });
        if (cancelled) return;
        elementsRef.current = elements;
        const el = elements.create('payment', {
          // No Link: the storefront collects name/email/phone itself, so
          // Link's sign-in banner and "save my info" block are redundant.
          wallets: { link: 'never' },
        });
        paymentElRef.current = el;
        el.mount(cardMountRef.current);
        builtForRef.current = payMethod;
      } catch (e) {
        builtForRef.current = '';
        if (!cancelled) {
          console.error('Stripe Payment Element failed to load', e);
          showError('Card payments could not be loaded. Please try another payment method.');
        }
      }
    }
    build();
    return () => {
      cancelled = true;
    };
  }, [payMethod, totals, ratesReady]);

  // Keep the Payment Element amount in sync with the order total.
  useEffect(() => {
    if (elementsRef.current && totals) {
      elementsRef.current.update({ amount: parseInt(totals.total_price, 10) || 0 });
    }
  }, [totals]);

  const setShipField = (k: keyof CheckoutAddress, v: string) =>
    setShip((s) => ({ ...s, [k]: v }));
  const setBillField = (k: keyof CheckoutAddress, v: string) =>
    setBill((s) => ({ ...s, [k]: v }));

  function validate(): string | null {
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.';
    // Names live in the Contact section (always visible); the address
    // sections auto-expand only for missing address fields.
    const nameReq: (keyof CheckoutAddress)[] = ['first_name', 'last_name'];
    const addrReq: (keyof CheckoutAddress)[] = ['address_1', 'city', 'postcode', 'country'];
    const shipNameBad = nameReq.some((k) => !(ship[k] ?? '').trim());
    const shipAddrBad = addrReq.some((k) => !(ship[k] ?? '').trim());
    if (shipAddrBad) setShipExpanded(true);
    let billBad = false;
    if (!billSame) {
      billBad = addrReq.some((k) => !(bill[k] ?? '').trim());
      if (billBad) setBillExpanded(true);
    }
    if (shipNameBad) return 'Please enter your first and last name.';
    if (shipAddrBad) return 'Please complete the shipping address.';
    if (billBad) return 'Please complete the billing address.';
    // The payment section is still hidden behind the shipping calculation —
    // "choose a payment method" would be wrong since the shopper can't.
    // Nudge the calc in case the debounced auto-calc hasn't fired yet.
    if (needsShipping && !ratesReady) {
      if (!calcBusy) calculateShipping(true);
      return 'Calculating delivery options — please wait a moment, then choose a payment method.';
    }
    if (!payMethod) return 'Please choose a payment method.';
    return null;
  }

  async function calculateShipping(silent = false) {
    // Auto-calc only needs the address itself (name/email/payment are
    // validated at place-order time).
    const addrReq: (keyof CheckoutAddress)[] = ['address_1', 'city', 'postcode', 'country'];
    for (const k of addrReq) {
      if (!(ship[k] ?? '').trim()) {
        if (!silent) showError('Please complete the shipping address.');
        return;
      }
    }
    setError('');
    setCalcBusy(true);
    try {
      const updated = (await api('/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update-customer',
          billing_address: { ...ship, email },
          shipping_address: ship,
        }),
      })) as CartWithRates;
      setLiveCart(updated);
      const sel: Record<number, string> = {};
      updated.shipping_rates.forEach((p) => {
        const s = p.shipping_rates.find((r) => r.selected) ?? p.shipping_rates[0];
        if (s) sel[p.package_id] = s.rate_id;
      });
      setSelectedRates(sel);
      setRatesReady(true);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not calculate shipping.');
    } finally {
      setCalcBusy(false);
    }
  }

  async function chooseRate(pkgId: number, rate: CheckoutShippingRate) {
    setSelectedRates((s) => ({ ...s, [pkgId]: rate.rate_id }));
    try {
      const updated = (await api('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ action: 'select-shipping-rate', package_id: pkgId, rate_id: rate.rate_id }),
      })) as CartWithRates;
      setLiveCart(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not select shipping method.');
    }
  }

  // Auto-calculate shipping for lookup selections only — manual entry
  // uses the explicit "Calculate shipping" button in the manual section.
  // Debounced; keyed on the address fields so an autocomplete selection
  // (which fills several fields at once) triggers a single call.
  // Skipped when shipping isn't needed or a calc is already in flight.
  const lastCalcKey = useRef('');
  const lookupSelectedRef = useRef(false);
  const shipKey = [ship.address_1, ship.city, ship.postcode, ship.country].join('|');
  useEffect(() => {
    if (!needsShipping || calcBusy || placing || orderNumber) return;
    const complete = [ship.address_1, ship.city, ship.postcode, ship.country].every((v) =>
      (v ?? '').trim()
    );
    if (!complete || shipKey === lastCalcKey.current) return;
    if (!lookupSelectedRef.current) return;
    const t = setTimeout(() => {
      lastCalcKey.current = shipKey;
      lookupSelectedRef.current = false;
      calculateShipping(true);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipKey, needsShipping]);

  // GA4 begin_checkout — once per checkout visit that has items in the bag.
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (beganCheckout.current || orderNumber) return;
    const items = cartData?.items;
    const totals = cartData?.totals;
    if (!items || items.length === 0 || !totals) return;
    beganCheckout.current = true;
    trackBeginCheckout(
      items.map((i) => cartLineToGaItem(i, i.quantity)),
      minorToDecimal(totals.total_price, totals.currency_minor_unit),
      items[0]?.prices.currency_code ?? 'USD'
    );
  }, [cartData, orderNumber]);

  async function placeOrder() {
    const bad = validate();
    if (bad) {
      showError(bad);
      return;
    }
    setError('');
    setPlacing(true);
    try {
      // Names now live only in the Contact section (bound to ship); a
      // separate billing address inherits them.
      const billing = {
        ...(billSame ? ship : { ...bill, first_name: ship.first_name, last_name: ship.last_name }),
        email,
      };
      const payment_data: { key: string; value: string }[] = [];

      // Any Stripe gateway (card, Klarna, Affirm, …) goes through the
      // confirmation-token flow; the Element runs in automatic mode to match
      // the backend's Dynamic Payment Methods.
      const upeTypes = stripeUpeTypes(payMethod);
      if (upeTypes) {
        const stripe = stripeRef.current;
        const elements = elementsRef.current;
        if (!stripe || !elements) throw new Error('Payment form is not ready yet.');
        // Stripe requires elements.submit() to run first — synchronously on
        // pay-press, before any async work — ahead of createConfirmationToken().
        // It validates the Payment Element and surfaces errors inline.
        const { error: submitErr } = await elements.submit();
        if (submitErr) throw new Error(submitErr.message || 'Please check your payment details.');
        const { error: tokErr, confirmationToken } = await stripe.createConfirmationToken({
          elements,
          params: {
            payment_method_data: {
              billing_details: {
                name: `${billing.first_name} ${billing.last_name}`.trim(),
                email,
                phone: billing.phone || undefined,
                address: {
                  line1: billing.address_1,
                  line2: billing.address_2 || undefined,
                  city: billing.city,
                  state: billing.state || undefined,
                  postal_code: billing.postcode,
                  country: billing.country,
                },
              },
            },
          },
        });
        if (tokErr) throw new Error(tokErr.message || 'Payment details could not be verified.');
        // Mirror the plugin's own Blocks integration: WC core's legacy bridge
        // (Legacy::process_legacy_payment) swaps $_POST with payment_data before
        // calling the gateway, and the gateway resolves the payment method TYPE
        // from $_POST['payment_method'] ('stripe' -> 'card',
        // 'stripe_klarna' -> 'klarna', …). Without this entry it throws
        // "The selected payment method type is invalid."
        payment_data.push({ key: 'payment_method', value: payMethod });
        payment_data.push({ key: 'wc-stripe-confirmation-token', value: confirmationToken.id });
      }

      const result = (await api('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          billing_address: billing,
          shipping_address: ship,
          payment_method: payMethod,
          payment_data,
          customer_note: note || undefined,
          create_account: createAccount || undefined,
        }),
      })) as CheckoutResponse;

      const pr = result.payment_result;
      const redirect = pr?.payment_details?.redirect_url as string | undefined;
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      if (pr && pr.payment_status !== 'success') {
        const msg =
          (pr.payment_details?.error_message as string) ||
          'Payment could not be completed. Please try another method.';
        throw new Error(msg);
      }

      // Snapshot the purchased bag for the GA4 purchase event before emptying it.
      const purchasedItems = (cartData?.items ?? []).map((i) => cartLineToGaItem(i, i.quantity));
      const purchasedValue = minorToDecimal(
        cartData?.totals?.total_price,
        cartData?.totals?.currency_minor_unit
      );

      // Success — show confirmation immediately; empty the purchased cart in
      // the background so it never blocks the Thank You page.
      const txnId = result.order_number || String(result.order_id);
      setOrderNumber(txnId);
      trackPurchase(
        txnId,
        purchasedValue,
        purchasedItems,
        cartData?.items?.[0]?.prices.currency_code ?? 'USD'
      );
      if (cart?.items?.length) {
        for (const item of cart.items) {
          removeItem(item.key).catch(() => null);
        }
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Order could not be placed.');
    } finally {
      setPlacing(false);
    }
  }

  const addressFields = useMemo(
    () => (
      addr: CheckoutAddress,
      set: (k: keyof CheckoutAddress, v: string) => void,
      idPrefix: string,
      expanded: boolean,
      setExpanded: (v: boolean) => void,
      // Shipping only: explicit recalculation for manual entry. Passed at
      // call time (not closed over) so the handler always sees fresh state.
      calc: { onCalculate: () => void; calculating: boolean } | null,
    ) => (
      <>
        <AddressAutocomplete
          id={`${idPrefix}-lookup`}
          onSelect={(p: ParsedAddress) => {
            lookupSelectedRef.current = true;
            if (p.street) set('address_1', p.street);
            if (p.city) set('city', p.city);
            if (p.state) set('state', p.state);
            if (p.postcode) set('postcode', p.postcode);
            if (p.country) set('country', p.country);
          }}
        />
        <div className={`${styles.manualWrap}${expanded ? ` ${styles.open}` : ''}`}>
          <div className={styles.manualInner}>
        <Field id={`${idPrefix}-a1`} label="Street address *" value={addr.address_1}
          onChange={(e) => set('address_1', e.target.value)} autoComplete="off" />
        <Field id={`${idPrefix}-a2`} label="Apt, suite, etc. (optional)" value={addr.address_2}
          onChange={(e) => set('address_2', e.target.value)} autoComplete="off" />
        <MDBRow>
          <MDBCol md="5">
            <Field id={`${idPrefix}-city`} label="City *" value={addr.city}
              onChange={(e) => set('city', e.target.value)} autoComplete="off" />
          </MDBCol>
          <MDBCol md="4">
            <Field id={`${idPrefix}-state`} label="State / Province" value={addr.state}
              onChange={(e) => set('state', e.target.value)} autoComplete="off" />
          </MDBCol>
          <MDBCol md="3">
            <Field id={`${idPrefix}-zip`} label="ZIP / Postcode *" value={addr.postcode}
              onChange={(e) => set('postcode', e.target.value)} autoComplete="off" />
          </MDBCol>
        </MDBRow>
        <MDBRow>
          <MDBCol md="6">
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-country`}>Country *</label>
              <select id={`${idPrefix}-country`} value={addr.country}
                onChange={(e) => set('country', e.target.value)} autoComplete="off">
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </MDBCol>
          <MDBCol md="6">
            <Field id={`${idPrefix}-phone`} label="Phone (optional)" type="tel" value={addr.phone}
              onChange={(e) => set('phone', e.target.value)} autoComplete="off" />
          </MDBCol>
        </MDBRow>
        {calc && (
          <button
            type="button"
            className={styles.calcBtn}
            disabled={calc.calculating}
            onClick={calc.onCalculate}>
            {calc.calculating ? 'Calculating…' : 'Calculate shipping'}
          </button>
        )}
          </div>
        </div>
        <button
          type="button"
          className={styles.manualToggle}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}>
          {expanded ? 'Hide manual address entry' : 'Enter address manually'}
        </button>
      </>
    ),
    [],
  );

  if (loading) {
    return (
      <MDBContainer className="py-5 text-center">
        <MDBSpinner role="status" className={styles.spinner} />
        <p className="mt-3" style={{ color: 'var(--muted)' }}>Preparing checkout…</p>
      </MDBContainer>
    );
  }

  if (loadError || !checkout) {
    return (
      <MDBContainer className="py-5 text-center">
        <h1 className={styles.title}>Checkout</h1>
        <p style={{ color: 'var(--muted)' }}>{loadError || 'Checkout is unavailable right now.'}</p>
        <MDBBtn outline color="light" onClick={() => window.location.reload()}>Try again</MDBBtn>
      </MDBContainer>
    );
  }

  if (orderNumber) {
    return (
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          <MDBCol md="8" lg="6">
            <MDBCard className={styles.card}>
              <MDBCardBody className="p-5 text-center">
                <div className={styles.check}>✓</div>
                <h1 className={styles.title}>Thank you</h1>
                <p style={{ color: 'var(--muted)' }}>
                  Your order <strong style={{ color: 'var(--gold-soft)' }}>#{orderNumber}</strong> has
                  been placed. A confirmation email is on its way.
                </p>
                <Link href="/" className={styles.goldBtn}>Continue shopping</Link>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <MDBContainer className="py-5 text-center">
        <h1 className={styles.title}>Checkout</h1>
        <p style={{ color: 'var(--muted)' }}>Your bag is empty.</p>
        <Link href="/" className={styles.goldBtn}>Browse the collection</Link>
      </MDBContainer>
    );
  }

  const stripeAvailable = paymentMethods.includes('stripe') && !!stripePromise;

  return (
    <MDBContainer className="py-5">
      <h1 className={styles.title}>Checkout</h1>
      <div ref={errorRef} aria-live="polite">
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <MDBRow>
        <MDBCol lg="7">
          {/* Contact */}
          <section className={styles.section}>
            <h2 className={styles.h2}>Contact</h2>
            <MDBRow>
              <MDBCol md="6">
                <Field id="co-fn" label="First name *" value={ship.first_name}
                  onChange={(e) => setShipField('first_name', e.target.value)} autoComplete="off" />
              </MDBCol>
              <MDBCol md="6">
                <Field id="co-ln" label="Last name *" value={ship.last_name}
                  onChange={(e) => setShipField('last_name', e.target.value)} autoComplete="off" />
              </MDBCol>
            </MDBRow>
            <Field id="co-email" label="Email address *" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            <label className={styles.checkRow}>
              <input type="checkbox" checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)} />
              Create an account for faster checkout next time
            </label>
          </section>

          {/* Shipping address */}
          <section className={styles.section}>
            <h2 className={styles.h2}>Shipping address</h2>
            {addressFields(ship, setShipField, 'ship', shipExpanded, setShipExpanded, {
              onCalculate: () => calculateShipping(),
              calculating: calcBusy,
            })}
            {calcBusy && (
              <p className={styles.hint} role="status">Calculating shipping…</p>
            )}
          </section>

          {/* Shipping method */}
          {needsShipping && ratesReady && (
            <section className={styles.section}>
              <h2 className={styles.h2}>Shipping method</h2>
              {packages.map((pkg) => (
                <div key={pkg.package_id}>
                  {pkg.shipping_rates.length === 0 && (
                    <p style={{ color: 'var(--muted)' }}>No shipping methods available for this address.</p>
                  )}
                  {pkg.shipping_rates.map((r) => (
                    <label key={r.rate_id} className={styles.radioRow}>
                      <input type="radio" name={`ship-${pkg.package_id}`}
                        checked={selectedRates[pkg.package_id] === r.rate_id}
                        onChange={() => chooseRate(pkg.package_id, r)} />
                      <span className={styles.radioText}>
                        <strong>{r.name}</strong>
                        {r.delivery_time ? <small> — {r.delivery_time}</small> : null}
                      </span>
                      <span className={styles.radioPrice}>
                        {totals ? money(r.price, totals) : ''}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* Billing */}
          <section className={styles.section}>
            <h2 className={styles.h2}>Billing address</h2>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={billSame} onChange={(e) => setBillSame(e.target.checked)} />
              <span>Same as shipping address</span>
            </label>
            {!billSame && addressFields(bill, setBillField, 'bill', billExpanded, setBillExpanded, null)}
          </section>

          {/* Payment — revealed only after shipping is calculated (or when the
              order needs no shipping): the card form must not mount while the
              shopper is still editing the address, and recalculating shipping
              must not wipe entered card details. */}
          {(!needsShipping || ratesReady) ? (
            <section className={styles.section}>
              <h2 className={styles.h2}>Payment</h2>
              {paymentMethods.length === 0 && (
                <p style={{ color: 'var(--muted)' }}>No payment methods are available right now.</p>
              )}
              {paymentMethods.map((m) => {
                const disabled = m === 'stripe' && !stripePromise;
                return (
                  <label key={m} className={`${styles.radioRow}${disabled ? ` ${styles.disabled}` : ''}`}>
                    <input type="radio" name="pay" checked={payMethod === m}
                      disabled={disabled} onChange={() => setPayMethod(m)} />
                    <span className={styles.radioText}>
                      <strong>{PAYMENT_LABELS[m] ?? m.replace(/[-_]/g, ' ')}</strong>
                      {disabled && <small> — card payments are not configured yet</small>}
                    </span>
                  </label>
                );
              })}
              {stripeUpeTypes(payMethod) && stripePromise && (
                <div className={`${styles.stripeBox} mb-3`}>
                  <div ref={cardMountRef} />
                </div>
              )}
              <Field id="co-note" label="Order notes (optional)" value={note}
                onChange={(e) => setNote(e.target.value)} autoComplete="off" />
            </section>
          ) : (
            <p className={styles.hint}>Enter your shipping address to see delivery options and payment.</p>
          )}

          {/* Pay button is always visible and clickable: with incomplete
              fields it triggers validation (errors shown at the top);
              with everything filled it submits the order. */}
          <MDBBtn className={styles.placeBtn} onClick={placeOrder} disabled={placing}>
            {placing ? 'Placing order…' : totals ? `Pay ${money(totals.total_price, totals)}` : 'Place order'}
          </MDBBtn>
        </MDBCol>

        {/* Summary */}
        <MDBCol lg="5">
          <aside className={styles.summary}>
            <h2 className={styles.h2}>Order summary</h2>
            {(cartData?.items ?? []).map((item) => {
              const url = lineProductUrl(item);
              const thumb = item.images?.[0]?.thumbnail;
              return (
              <div key={item.key} className={styles.line}>
                <div className={styles.lineMain}>
                  {thumb && (
                    url ? (
                      <Link href={url} className={styles.thumbLink} aria-label={decodeEntities(item.name)}>
                        <Image src={thumb} alt="" width={64} height={72} className={styles.thumb} />
                      </Link>
                    ) : (
                      <Image src={thumb} alt="" width={64} height={72} className={styles.thumb} />
                    )
                  )}
                  <span className={styles.lineName}>
                    {url ? (
                      <Link href={url} className={styles.titleLink}>{decodeEntities(item.name)}</Link>
                    ) : (
                      decodeEntities(item.name)
                    )}
                    <span className={styles.lineControls}>
                      <span className="qty-stepper" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>
                        <button type="button" aria-label="Decrease quantity" disabled={busy} onClick={() => changeQty(item.key, item.quantity - 1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label="Increase quantity" disabled={busy} onClick={() => changeQty(item.key, item.quantity + 1)}>
                          +
                        </button>
                      </span>
                      <button type="button" className={styles.removeBtn} disabled={busy} onClick={() => removeLine(item.key)}>
                        Remove
                      </button>
                    </span>
                  </span>
                </div>
                <span className={styles.linePrice}>
                  {totals ? money(item.totals?.line_total, totals) : ''}
                </span>
              </div>
              );
            })}
            {totals && (
              <dl className={styles.totals}>
                <div><dt>Subtotal</dt><dd>{money(totals.total_items, totals)}</dd></div>
                {totals.total_discount !== '0' && (
                  <div><dt>Discount</dt><dd>−{money(totals.total_discount, totals)}</dd></div>
                )}
                <div>
                  <dt>Shipping</dt>
                  <dd>{totals.total_shipping === null ? '—' : money(totals.total_shipping, totals)}</dd>
                </div>
                <div><dt>Taxes</dt><dd>{money(totals.total_tax, totals)}</dd></div>
                <div className={styles.grand}>
                  <dt>Total</dt><dd>{money(totals.total_price, totals)}</dd>
                </div>
              </dl>
            )}
          </aside>
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
}
