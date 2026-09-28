'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MDBBadge } from 'mdb-react-ui-kit';
import type { StoreImage } from '@/lib/woo';

export default function ProductGallery({ images, name, onSale }: { images: StoreImage[]; name: string; onSale: boolean }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) return null;

  return (
    <div>
      <div className="position-relative mb-3">
        {onSale && (
          <MDBBadge color="danger" pill className="sale-badge">
            Sale
          </MDBBadge>
        )}
        <Image
          src={current.src}
          alt={current.alt || name}
          width={1000}
          height={1000}
          className="w-100 rounded"
          style={{ objectFit: 'cover', aspectRatio: '1 / 1' }}
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="d-flex gap-2 thumb-strip flex-wrap">
          {images.map((img, i) => (
            <Image
              key={img.id}
              src={img.thumbnail || img.src}
              alt={img.alt || `${name} ${i + 1}`}
              width={80}
              height={80}
              className={i === active ? 'active' : ''}
              style={{ objectFit: 'cover' }}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
