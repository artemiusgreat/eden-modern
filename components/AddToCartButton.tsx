'use client';

import { useState } from 'react';
import { MDBBtn, MDBSpinner, MDBIcon } from 'mdb-react-ui-kit';
import { useCart } from './cart/CartProvider';

export default function AddToCartButton({
  productId,
  quantity = 1,
  disabled,
  size,
  className,
  children,
  compact,
  ariaLabel,
}: {
  productId: number;
  quantity?: number;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <MDBBtn
      color="primary"
      size={size}
      className={className}
      disabled={disabled || adding || failed}
      aria-label={failed ? 'Out of stock' : ariaLabel}
      onClick={async () => {
        setAdding(true);
        try {
          await addItem(productId, quantity);
          setAdded(true);
          setTimeout(() => setAdded(false), 1600);
        } catch (e) {
          // Out-of-stock (stale listing data): reflect it in the UI instead
          // of failing silently. Other errors show briefly.
          const msg = e instanceof Error ? e.message : String(e);
          if (/out_of_stock|out of stock/i.test(msg)) {
            setFailed(true);
          } else {
            setFailed(true);
            setTimeout(() => setFailed(false), 2500);
          }
        } finally {
          setAdding(false);
        }
      }}
    >
      {adding ? (
        <MDBSpinner size="sm" />
      ) : failed ? (
        <>
          <MDBIcon fas icon="ban" className="me-2" />
          Out of stock
        </>
      ) : added ? (
        compact ? (
          <MDBIcon fas icon="check" />
        ) : (
          <>
            <MDBIcon fas icon="check" className="me-2" />
            Added
          </>
        )
      ) : (
        children ?? 'Add to cart'
      )}
    </MDBBtn>
  );
}
