'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBIcon } from 'mdb-react-ui-kit';
import { progressBegin, progressEnd } from '@/lib/progress';
import styles from './AccountView.module.css';

type Tab = 'orders' | 'addresses' | 'account';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending payment',
  processing: 'Processing',
  'on-hold': 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

const money = (amount: string | number | null | undefined, currency = 'USD') => {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ---------- shared bits ---------- */

function Notice({ kind, children }: { kind: 'error' | 'ok' | 'info'; children: React.ReactNode }) {
  return (
    <div className={`${styles.notice} ${styles[`notice_${kind}`]}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="mb-3 text-start">
      <label className="form-label small" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <input {...props} className={`form-control ${styles.input}`} />
    </div>
  );
}

function SessionExpired() {
  return (
    <Notice kind="info">
      Your session expired.{' '}
      <a href="/account" style={{ color: 'var(--gold)' }}>
        Sign in again
      </a>{' '}
      to continue.
    </Notice>
  );
}

function SetupNeeded({ message }: { message: string }) {
  return (
    <Notice kind="info">
      <strong style={{ color: 'var(--ink)' }}>Almost there.</strong>
      <br />
      {message}
    </Notice>
  );
}

// A 401 with reason=customer_not_found means the WordPress session is valid
// but the account has no WooCommerce customer record — not an expired session.
const isCustomerMissing = (data: any) => data?.reason === 'customer_not_found';
const noCustomerMsg =
  'You are signed in, but this account has no customer record in the store yet. Place an order or contact us and we will link it up.';

/* ---------- Loading skeletons ----------
   Shimmer placeholders shown while a section fetches. Each one approximates
   the shape of its content so the layout doesn't shift when data arrives. */

function OrdersSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.skelOrderRow}>
          <div style={{ flex: 1 }}>
            <div className={styles.skel} style={{ height: '1rem', width: '42%', marginBottom: '0.5rem' }} />
            <div className={styles.skel} style={{ height: '0.8rem', width: '30%' }} />
          </div>
          <div className={styles.skel} style={{ height: '0.9rem', width: '5.5rem', flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

function AddressesSkeleton() {
  return (
    <div aria-hidden="true">
      <MDBRow>
        {[0, 1].map((col) => (
          <MDBCol key={col} md="6" className="mb-4">
            <div className={styles.skel} style={{ height: '1.1rem', width: '45%', marginBottom: '1.25rem' }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.skelField}>
                <div className={styles.skel} style={{ height: '0.75rem', width: '28%', marginBottom: '0.45rem' }} />
                <div className={styles.skel} style={{ height: '2.9rem' }} />
              </div>
            ))}
          </MDBCol>
        ))}
      </MDBRow>
      <div className={styles.skel} style={{ height: '2.75rem', width: '11rem' }} />
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div aria-hidden="true" style={{ maxWidth: 560 }}>
      <div className={styles.grid2} style={{ marginBottom: '1rem' }}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.skelField} style={{ marginBottom: 0 }}>
            <div className={styles.skel} style={{ height: '0.75rem', width: '35%', marginBottom: '0.45rem' }} />
            <div className={styles.skel} style={{ height: '2.9rem' }} />
          </div>
        ))}
      </div>
      <div className={styles.skelField}>
        <div className={styles.skel} style={{ height: '0.75rem', width: '30%', marginBottom: '0.45rem' }} />
        <div className={styles.skel} style={{ height: '2.9rem' }} />
      </div>
      <div className={styles.skel} style={{ height: '1.1rem', width: '40%', margin: '1.75rem 0 1rem' }} />
      <div className={styles.grid2}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.skelField} style={{ marginBottom: 0 }}>
            <div className={styles.skel} style={{ height: '0.75rem', width: '40%', marginBottom: '0.45rem' }} />
            <div className={styles.skel} style={{ height: '2.9rem' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Orders ---------- */

type OrderSummary = {
  id: number;
  number: string;
  date: string;
  status: string;
  total: string;
  currency: string;
  items: { name: string; quantity: number; total: string }[];
};

function OrdersTab() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  useEffect(() => {
    (async () => {
      progressBegin();
      try {
        const res = await fetch('/api/account/orders');
        const data = await res.json();
        if (res.status === 401) return isCustomerMissing(data) ? setError(noCustomerMsg) : setExpired(true);
        if (!data.ok) {
          if (res.status === 503) return setSetup(data.error);
          return setError(data.error ?? 'Could not load orders.');
        }
        setOrders(data.orders);
      } catch {
        setError('Could not reach the store. Please try again.');
      } finally {
        progressEnd();
      }
    })();
  }, []);

  const toggle = async (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailBusy(true);
    try {
      const res = await fetch(`/api/account/orders/${id}`);
      const data = await res.json();
      if (data.ok) setDetail(data.order);
    } catch {
      /* keep list usable */
    } finally {
      setDetailBusy(false);
    }
  };

  if (expired) return <SessionExpired />;
  if (setup) return <SetupNeeded message={setup} />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!orders) return <OrdersSkeleton />;
  if (!orders.length)
    return (
      <Notice kind="info">
        No orders yet. When you check out, your order history will appear here.
      </Notice>
    );

  const statusClass = (s: string) =>
    s === 'completed'
      ? styles.stCompleted
      : s === 'processing' || s === 'on-hold'
        ? styles.stProcessing
        : s === 'cancelled' || s === 'refunded' || s === 'failed'
          ? styles.stCancelled
          : styles.stPending;

  return (
    <div>
      {orders.map((o) => (
        <div key={o.id} className={styles.orderWrap}>
          <button type="button" className={styles.orderRow} onClick={() => toggle(o.id)} aria-expanded={openId === o.id}>
            <span className={styles.orderMain}>
              <strong className={styles.orderNum}>Order #{o.number}</strong>
              <span className={styles.orderMeta}>
                {fmtDate(o.date)} · {o.items.reduce((n, i) => n + i.quantity, 0)} items
              </span>
            </span>
            <span className={styles.orderSide}>
              <span className={`${styles.status} ${statusClass(o.status)}`}>
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
              <strong className={styles.orderTotal}>{money(o.total, o.currency)}</strong>
              <MDBIcon fas icon={openId === o.id ? 'chevron-up' : 'chevron-down'} className={styles.orderChevron} />
            </span>
          </button>
          {openId === o.id && (
            <div className={styles.orderDetail}>
              {detailBusy && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
              {detail && (
                <>
                  <div className={styles.detailGrid}>
                    <div>
                      <h4 className={styles.detailH}>Items</h4>
                      {detail.items.map((it: any, i: number) => (
                        <div key={i} className={styles.lineItem}>
                          <span>
                            {it.name} <span style={{ color: 'var(--muted)' }}>× {it.quantity}</span>
                          </span>
                          <span>{money(it.total, detail.currency)}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className={styles.detailH}>Totals</h4>
                      <div className={styles.lineItem}>
                        <span style={{ color: 'var(--muted)' }}>Payment</span>
                        <span>{detail.payment_method || '—'}</span>
                      </div>
                      {detail.shipping_total != null && (
                        <div className={styles.lineItem}>
                          <span style={{ color: 'var(--muted)' }}>Shipping</span>
                          <span>{money(detail.shipping_total, detail.currency)}</span>
                        </div>
                      )}
                      {detail.tax_total != null && Number(detail.tax_total) > 0 && (
                        <div className={styles.lineItem}>
                          <span style={{ color: 'var(--muted)' }}>Tax</span>
                          <span>{money(detail.tax_total, detail.currency)}</span>
                        </div>
                      )}
                      <div className={`${styles.lineItem} ${styles.lineTotal}`}>
                        <span>Total</span>
                        <span>{money(detail.total, detail.currency)}</span>
                      </div>
                    </div>
                  </div>
                  {(detail.shipping?.address_1 || detail.billing?.address_1) && (
                    <div className={styles.detailGrid}>
                      {detail.shipping?.address_1 && (
                        <div>
                          <h4 className={styles.detailH}>Ship to</h4>
                          <p className={styles.addrText}>
                            {detail.shipping.first_name} {detail.shipping.last_name}
                            <br />
                            {detail.shipping.address_1}
                            {detail.shipping.address_2 && <>, {detail.shipping.address_2}</>}
                            <br />
                            {detail.shipping.city}, {detail.shipping.state} {detail.shipping.postcode}
                          </p>
                        </div>
                      )}
                      {detail.billing?.address_1 && (
                        <div>
                          <h4 className={styles.detailH}>Bill to</h4>
                          <p className={styles.addrText}>
                            {detail.billing.first_name} {detail.billing.last_name}
                            <br />
                            {detail.billing.address_1}
                            {detail.billing.address_2 && <>, {detail.billing.address_2}</>}
                            <br />
                            {detail.billing.city}, {detail.billing.state} {detail.billing.postcode}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Addresses ---------- */

const ADDR_FIELDS: { key: string; label: string; half?: boolean }[] = [
  { key: 'first_name', label: 'First name', half: true },
  { key: 'last_name', label: 'Last name', half: true },
  { key: 'company', label: 'Company (optional)' },
  { key: 'address_1', label: 'Street address' },
  { key: 'address_2', label: 'Apartment, suite, etc. (optional)' },
  { key: 'city', label: 'City', half: true },
  { key: 'state', label: 'State / Province', half: true },
  { key: 'postcode', label: 'ZIP / Postcode', half: true },
  { key: 'country', label: 'Country', half: true },
  { key: 'phone', label: 'Phone' },
];

function AddressForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div>
      <h3 className={styles.formH}>{title}</h3>
      <div className={styles.grid2}>
        {ADDR_FIELDS.map((f) => (
          <div key={f.key} className={f.half ? '' : styles.span2}>
            <Field
              label={f.label}
              value={value[f.key] ?? ''}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              autoComplete={f.key === 'address_1' ? 'street-address' : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressesTab() {
  const [billing, setBilling] = useState<Record<string, string> | null>(null);
  const [shipping, setShipping] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      progressBegin();
      try {
        const res = await fetch('/api/account/customer');
        const data = await res.json();
        if (res.status === 401) return isCustomerMissing(data) ? setError(noCustomerMsg) : setExpired(true);
        if (!data.ok) {
          if (res.status === 503) return setSetup(data.error);
          return setError(data.error ?? 'Could not load addresses.');
        }
        setBilling(data.customer.billing ?? {});
        setShipping(data.customer.shipping ?? {});
      } catch {
        setError('Could not reach the store. Please try again.');
      } finally {
        progressEnd();
      }
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    progressBegin();
    try {
      const res = await fetch('/api/account/customer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing, shipping }),
      });
      const data = await res.json();
      if (res.status === 401) return isCustomerMissing(data) ? setError(noCustomerMsg) : setExpired(true);
      if (!data.ok) return setError(data.error ?? 'Could not save addresses.');
      setBilling(data.customer.billing ?? {});
      setShipping(data.customer.shipping ?? {});
      setSaved(true);
    } catch {
      setError('Could not reach the store. Please try again.');
    } finally {
      setBusy(false);
      progressEnd();
    }
  };

  if (expired) return <SessionExpired />;
  if (setup) return <SetupNeeded message={setup} />;
  if (error && !billing) return <Notice kind="error">{error}</Notice>;
  if (!billing || !shipping) return <AddressesSkeleton />;

  return (
    <div>
      {error && <Notice kind="error">{error}</Notice>}
      {saved && <Notice kind="ok">Addresses saved.</Notice>}
      <MDBRow>
        <MDBCol md="6" className="mb-4">
          <AddressForm title="Billing address" value={billing} onChange={(v) => { setBilling(v); setSaved(false); }} />
        </MDBCol>
        <MDBCol md="6" className="mb-4">
          <AddressForm title="Shipping address" value={shipping} onChange={(v) => { setShipping(v); setSaved(false); }} />
        </MDBCol>
      </MDBRow>
      <button type="button" className="btn-gold" disabled={busy} onClick={save}>
        {busy ? 'Saving…' : 'Save addresses'}
      </button>
    </div>
  );
}

/* ---------- Account details ---------- */

function AccountTab() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      progressBegin();
      try {
        const res = await fetch('/api/account/customer');
        const data = await res.json();
        if (res.status === 401) return isCustomerMissing(data) ? setError(noCustomerMsg) : setExpired(true);
        if (!data.ok) {
          if (res.status === 503) return setSetup(data.error);
          return setError(data.error ?? 'Could not load account details.');
        }
        setFirst(data.customer.first_name ?? '');
        setLast(data.customer.last_name ?? '');
        setEmail(data.customer.email ?? '');
        setLoaded(true);
      } catch {
        setError('Could not reach the store. Please try again.');
      } finally {
        progressEnd();
      }
    })();
  }, []);

  const save = async () => {
    setError(null);
    setSaved(false);
    if (pw1 || pw2) {
      if (pw1 !== pw2) return setError('New passwords do not match.');
      if (pw1.length < 8) return setError('New password must be at least 8 characters.');
    }
    setBusy(true);
    progressBegin();
    try {
      const payload: Record<string, string> = { first_name: first, last_name: last, email };
      if (pw1) payload.password = pw1;
      const res = await fetch('/api/account/customer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) return isCustomerMissing(data) ? setError(noCustomerMsg) : setExpired(true);
      if (!data.ok) return setError(data.error ?? 'Could not save details.');
      setFirst(data.customer.first_name ?? '');
      setLast(data.customer.last_name ?? '');
      setEmail(data.customer.email ?? '');
      setPw1('');
      setPw2('');
      setSaved(true);
    } catch {
      setError('Could not reach the store. Please try again.');
    } finally {
      setBusy(false);
      progressEnd();
    }
  };

  if (expired) return <SessionExpired />;
  if (setup) return <SetupNeeded message={setup} />;
  if (error && !loaded) return <Notice kind="error">{error}</Notice>;
  if (!loaded) return <AccountSkeleton />;

  return (
    <>
      {error && <Notice kind="error">{error}</Notice>}
      {saved && <Notice kind="ok">Details saved.</Notice>}
      <div className={styles.grid2}>
        <Field label="First name" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
        <Field label="Last name" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
      </div>
      <Field label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <h3 className={styles.formH} style={{ marginTop: '1.75rem' }}>Change password</h3>
      <p className="small mb-3" style={{ color: 'var(--muted)' }}>
        Leave blank to keep your current password.
      </p>
      <div className={styles.grid2}>
        <Field label="New password" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" />
        <Field label="Confirm new password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
      </div>
      <button type="button" className="btn-gold mt-2" disabled={busy} onClick={save}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </>
  );
}

/* ---------- Dashboard ---------- */

export default function AccountDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    progressBegin();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      progressEnd();
    }
    router.refresh();
  };

  return (
    <>
      <MDBContainer className="py-5">
        <MDBRow>
          <MDBCol lg="3" className="mb-4 mb-lg-0">
            <nav className={styles.sideNav} aria-label="Account sections">
              {(
                [
                  ['orders', 'Orders', 'box-open'],
                  ['addresses', 'Addresses', 'location-dot'],
                  ['account', 'Account details', 'user'],
                ] as const
              ).map(([key, label, icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-current={tab === key ? 'page' : undefined}
                  className={`${styles.sideItem} ${tab === key ? styles.sideActive : ''}`}
                  onClick={() => setTab(key)}
                >
                  <MDBIcon fas fixed icon={icon} className={styles.sideIcon} />
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={styles.sideItem}
                onClick={signOut}
                disabled={signingOut}
              >
                <MDBIcon fas fixed icon="arrow-right-from-bracket" className={styles.sideIcon} />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </nav>
          </MDBCol>
          <MDBCol lg="9">
          <MDBCard className={styles.card}>
            <MDBCardBody className={`${styles.cardBody} p-4 p-md-5`}>
              {tab === 'orders' && <OrdersTab />}
              {tab === 'addresses' && <AddressesTab />}
              {tab === 'account' && <AccountTab />}
            </MDBCardBody>
          </MDBCard>
          <p className="small my-3" style={{ color: 'var(--muted)' }}>
            Need help?{' '}
            <Link href="/contact" style={{ color: 'var(--gold)' }}>
              Contact us
            </Link>
          </p>
        </MDBCol>
        </MDBRow>
      </MDBContainer>
    </>
  );
}
