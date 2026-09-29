'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { loadStripe, type Stripe, type StripeElements, type StripeElement } from '@stripe/stripe-js';
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBInput,
  MDBBtn,
  MDBSpinner,
} from 'mdb-react-ui-kit';
import { useCart } from '@/components/cart/CartProvider';
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
  'ppcp-gateway': 'PayPal',
};

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

export default function CheckoutView() {
  const { cart, removeItem } = useCart();
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Live cart snapshot from update-customer / select-shipping-rate responses —
  // the cart endpoint (not the checkout draft) is the source of truth for
  // shipping rates and totals.
  const [liveCart, setLiveCart] = useState<CartWithRates | null>(null);
  const cartData = liveCart ?? (cart as CartWithRates | null);
  const totals = cartData ? (cartData.totals as unknown as CartTotalsFull) : null;

  const [email, setEmail] = useState('');
  const [ship, setShip] = useState<CheckoutAddress>(() => emptyAddress());
  const [billSame, setBillSame] = useState(true);
  const [bill, setBill] = useState<CheckoutAddress>(() => emptyAddress());
  const [note, setNote] = useState('');

  const [ratesReady, setRatesReady] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);
  const [selectedRates, setSelectedRates] = useState<Record<number, string>>({});
  const [payMethod, setPayMethod] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElRef = useRef<StripeElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);
  const payMethodRef = useRef(payMethod);
  payMethodRef.current = payMethod;

  const loadCheckout = useCallback(async () => {
    // Only payment methods + saved addresses come from the checkout draft;
    // rates/totals are read from the cart endpoint (see liveCart).
    const data = (await api('/api/checkout')) as CheckoutResponse;
    setCheckout(data);
    const methods = data.__experimentalCart.payment_methods;
    if (!payMethodRef.current && methods.length) {
      setPayMethod(methods.includes('stripe') ? 'stripe' : methods[0]);
    }
    return data;
  }, []);

  useEffect(() => {
    loadCheckout()
      .then((d) => {
        if (d.billing_address?.email) setEmail(d.billing_address.email);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsShipping = checkout?.__experimentalCart.needs_shipping ?? true;
  const paymentMethods = checkout?.__experimentalCart.payment_methods ?? [];
  const packages = cartData?.shipping_rates ?? [];

  // (Re)build the Stripe Payment Element when card payment is selected.
  useEffect(() => {
    let cancelled = false;
    async function build() {
      if (payMethod !== 'stripe' || !stripePromise || !totals || !cardMountRef.current) return;
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;
      paymentElRef.current?.destroy();
      paymentElRef.current = null;
      const elements = stripe.elements({
        mode: 'payment',
        amount: parseInt(totals.total_price, 10) || 0,
        currency: totals.currency_code.toLowerCase(),
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
      const el = elements.create('payment');
      paymentElRef.current = el;
      el.mount(cardMountRef.current);
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
    const req: (keyof CheckoutAddress)[] = ['first_name', 'last_name', 'address_1', 'city', 'postcode', 'country'];
    for (const k of req) if (!(ship[k] ?? '').trim()) return 'Please complete the shipping address.';
    if (!billSame) for (const k of req) if (!(bill[k] ?? '').trim()) return 'Please complete the billing address.';
    if (!payMethod) return 'Please choose a payment method.';
    return null;
  }

  async function calculateShipping() {
    const bad = validate();
    if (bad && !bad.startsWith('Please choose')) {
      setError(bad);
      return;
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
      setError(e instanceof Error ? e.message : 'Could not calculate shipping.');
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

  async function placeOrder() {
    const bad = validate();
    if (bad) {
      setError(bad);
      return;
    }
    setError('');
    setPlacing(true);
    try {
      const billing = { ...(billSame ? ship : bill), email };
      const payment_data: { key: string; value: string }[] = [];

      if (payMethod === 'stripe') {
        const stripe = stripeRef.current;
        const elements = elementsRef.current;
        if (!stripe || !elements) throw new Error('Card form is not ready yet.');
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
        if (tokErr) throw new Error(tokErr.message || 'Card details could not be verified.');
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

      // Success — empty the purchased cart, then show confirmation.
      if (cart?.items?.length) {
        for (const item of cart.items) {
          await removeItem(item.key).catch(() => null);
        }
      }
      setOrderNumber(result.order_number || String(result.order_id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order could not be placed.');
    } finally {
      setPlacing(false);
    }
  }

  const addressFields = useMemo(
    () => (
      addr: CheckoutAddress,
      set: (k: keyof CheckoutAddress, v: string) => void,
      idPrefix: string,
    ) => (
      <>
        <MDBRow>
          <MDBCol md="6" className="mb-3">
            <MDBInput label="First name *" id={`${idPrefix}-fn`} value={addr.first_name}
              onChange={(e) => set('first_name', e.target.value)} />
          </MDBCol>
          <MDBCol md="6" className="mb-3">
            <MDBInput label="Last name *" id={`${idPrefix}-ln`} value={addr.last_name}
              onChange={(e) => set('last_name', e.target.value)} />
          </MDBCol>
        </MDBRow>
        <div className="mb-3">
          <MDBInput label="Street address *" id={`${idPrefix}-a1`} value={addr.address_1}
            onChange={(e) => set('address_1', e.target.value)} />
        </div>
        <div className="mb-3">
          <MDBInput label="Apt, suite, etc. (optional)" id={`${idPrefix}-a2`} value={addr.address_2}
            onChange={(e) => set('address_2', e.target.value)} />
        </div>
        <MDBRow>
          <MDBCol md="5" className="mb-3">
            <MDBInput label="City *" id={`${idPrefix}-city`} value={addr.city}
              onChange={(e) => set('city', e.target.value)} />
          </MDBCol>
          <MDBCol md="4" className="mb-3">
            <MDBInput label="State / Province" id={`${idPrefix}-state`} value={addr.state}
              onChange={(e) => set('state', e.target.value)} />
          </MDBCol>
          <MDBCol md="3" className="mb-3">
            <MDBInput label="ZIP / Postcode *" id={`${idPrefix}-zip`} value={addr.postcode}
              onChange={(e) => set('postcode', e.target.value)} />
          </MDBCol>
        </MDBRow>
        <MDBRow>
          <MDBCol md="6" className="mb-3">
            <label className={styles.selectLabel} htmlFor={`${idPrefix}-country`}>Country *</label>
            <select id={`${idPrefix}-country`} className={styles.select}
              value={addr.country} onChange={(e) => set('country', e.target.value)}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </MDBCol>
          <MDBCol md="6" className="mb-3">
            <MDBInput label="Phone (optional)" id={`${idPrefix}-phone`} type="tel" value={addr.phone}
              onChange={(e) => set('phone', e.target.value)} />
          </MDBCol>
        </MDBRow>
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
      <MDBRow>
        <MDBCol lg="7">
          {/* Contact */}
          <section className={styles.section}>
            <h2 className={styles.h2}>Contact</h2>
            <MDBInput label="Email address *" id="co-email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </section>

          {/* Shipping address */}
          <section className={styles.section}>
            <h2 className={styles.h2}>Shipping address</h2>
            {addressFields(ship, setShipField, 'ship')}
            <MDBBtn className={styles.ghostBtn} onClick={calculateShipping} disabled={calcBusy}>
              {calcBusy ? 'Calculating…' : ratesReady ? 'Recalculate shipping' : 'Calculate shipping'}
            </MDBBtn>
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
            {!billSame && addressFields(bill, setBillField, 'bill')}
          </section>

          {/* Payment */}
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
            {payMethod === 'stripe' && stripePromise && (
              <div className={styles.stripeBox}>
                <div ref={cardMountRef} />
              </div>
            )}
            {payMethod === 'ppcp-gateway' && (
              <p className={styles.hint}>You will be redirected to PayPal to complete your purchase.</p>
            )}
            <div className="mt-3">
              <MDBInput label="Order notes (optional)" id="co-note" value={note}
                onChange={(e) => setNote(e.target.value)} />
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}
          <MDBBtn className={styles.placeBtn} onClick={placeOrder} disabled={placing || !ratesReady && needsShipping}>
            {placing ? 'Placing order…' : totals ? `Pay ${money(totals.total_price, totals)}` : 'Place order'}
          </MDBBtn>
          {!ratesReady && needsShipping && (
            <p className={styles.hint}>Enter your address and calculate shipping first.</p>
          )}
        </MDBCol>

        {/* Summary */}
        <MDBCol lg="5">
          <aside className={styles.summary}>
            <h2 className={styles.h2}>Order summary</h2>
            {(cartData?.items ?? []).map((item) => (
              <div key={item.key} className={styles.line}>
                <span className={styles.lineName}>
                  {item.name} <small>× {item.quantity}</small>
                </span>
                <span className={styles.linePrice}>
                  {totals ? money(item.totals?.line_total, totals) : ''}
                </span>
              </div>
            ))}
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
