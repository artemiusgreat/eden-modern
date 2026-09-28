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

  return (
    <MDBBtn
      color="primary"
      size={size}
      className={className}
      disabled={disabled || adding}
      aria-label={ariaLabel}
      onClick={async () => {
        setAdding(true);
        try {
          await addItem(productId, quantity);
          setAdded(true);
          setTimeout(() => setAdded(false), 1600);
        } finally {
          setAdding(false);
        }
      }}
    >
      {adding ? (
        <MDBSpinner size="sm" />
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
