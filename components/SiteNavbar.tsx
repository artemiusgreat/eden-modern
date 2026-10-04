'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MDBNavbar,
  MDBNavbarBrand,
  MDBNavbarToggler,
  MDBCollapse,
  MDBNavbarNav,
  MDBNavbarItem,
  MDBNavbarLink,
  MDBBtn,
  MDBBadge,
  MDBIcon,
  MDBInputGroup,
} from 'mdb-react-ui-kit';
import { useCart } from './cart/CartProvider';
import styles from './SiteNavbar.module.css';

interface MenuLink {
  name: string;
  href: string;
  /** Rendered as the gold "shop all" footer link of the dropdown. */
  highlight?: boolean;
}

interface MenuGroup {
  /** Small heading above the group's links; null for an ungrouped list. */
  label: string | null;
  links: MenuLink[];
}

interface MenuEntry {
  name: string;
  href: string;
  groups: MenuGroup[];
}

/* Curated pillars: the site focuses on fragrances and skincare, so the menu
   is editorial rather than the raw top-level WP categories. Slugs are the
   stable SEO identifiers; the "shop all" catalog link uses category ids
   (89 = Perfumes & Colognes, 92 = Home Fragrances). */
const MENU: MenuEntry[] = [
  {
    name: 'Fragrances',
    href: '/product-category/perfumes-colognes',
    groups: [
      {
        label: null,
        links: [
          { name: 'Perfumes & Colognes', href: '/product-category/perfumes-colognes' },
          { name: 'Home Fragrances', href: '/product-category/home-fragrances' },
          { name: 'Shop all fragrances', href: '/catalog?category=89,92', highlight: true },
        ],
      },
    ],
  },
  {
    name: 'Skincare',
    href: '/product-category/skin-care-cosmetics',
    groups: [
      {
        label: 'Face',
        links: [
          { name: 'All Skincare', href: '/product-category/skin-care-cosmetics' },
          { name: 'Facial Cleansers', href: '/product-category/facial-cleansers' },
          { name: 'Eye Creams', href: '/product-category/eye-creams' },
          { name: 'Masks & Peels', href: '/product-category/skin-care-masks-peels' },
          { name: 'Lip Treatments', href: '/product-category/lip-balms-treatments' },
        ],
      },
      {
        label: 'Body',
        links: [
          { name: 'Bath & Body', href: '/product-category/bath-body' },
          { name: 'Lotions & Moisturizers', href: '/product-category/lotions-moisturizers' },
        ],
      },
    ],
  },
];

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { cart, setDrawerOpen } = useCart();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      router.push(`/catalog?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <MDBNavbar expand="xl" className={styles.navbar} sticky>
      <div className={`${styles.navbarInner} container`}>
        <Link href="/" className="mr-5">
          <MDBNavbarBrand tag="span" className={styles.brand}>
            Indemos<small>Beauty & Fragrance</small>
          </MDBNavbarBrand>
        </Link>
        <MDBNavbarToggler
          aria-controls="lux-navbar"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
          className="ms-auto">
          <MDBIcon fas icon="bars" />
        </MDBNavbarToggler>
        <MDBCollapse navbar open={open} id="lux-navbar" className={styles.menu}>
          <div className="d-flex align-items-center">
            <MDBNavbarNav className={`${styles.links} mx-auto w-auto me-5`}>
              {MENU.map((entry) => (
                <MDBNavbarItem key={entry.name} className={styles.dropWrap}>
                  <Link href={entry.href}>
                    <MDBNavbarLink tag="span" className={styles.navLink} onClick={() => setOpen(false)}>
                      {entry.name}
                      <MDBIcon fas icon="chevron-down" className="ms-2" style={{ fontSize: '0.6rem' }} />
                    </MDBNavbarLink>
                  </Link>
                  <div className={styles.dropMenu}>
                    {entry.groups.map((g, gi) => (
                      <div key={gi} className={styles.dropGroup}>
                        {g.label && <p className={styles.dropLabel}>{g.label}</p>}
                        {g.links.map((l) => (
                          <Link
                            key={l.name}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className={l.highlight ? styles.dropAll : undefined}>
                            {l.name}
                            {l.highlight && <MDBIcon fas icon="arrow-right" className="ms-1" />}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </MDBNavbarItem>
              ))}
              <MDBNavbarItem>
                <Link href="/magazine">
                  <MDBNavbarLink tag="span" className={styles.navLink} onClick={() => setOpen(false)}>
                    Magazine
                  </MDBNavbarLink>
                </Link>
              </MDBNavbarItem>
            </MDBNavbarNav>

            <form className={`${styles.searchShell} me-2`} role="search" onSubmit={submitSearch}>
              <MDBInputGroup>
                <input
                  type="search"
                  className="form-control h-100"
                  placeholder="Search products"
                  aria-label="Search products"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)} />
                <button type="submit" className={styles.searchBtn}>
                  <MDBIcon fas icon="magnifying-glass" />
                </button>
              </MDBInputGroup>
            </form>

            <div className={styles.actions}>
              <Link href="/catalog?on_sale=1" className={`btn-outline-noir ${styles.cta}`}>
                Shop Sale
              </Link>
              <Link href="/account">
                <MDBBtn tag="span" color="link" className={styles.iconBtn} aria-label="My account">
                  <MDBIcon far icon="user" />
                </MDBBtn>
              </Link>
              <MDBBtn
                color="link"
                className={`${styles.iconBtn} px-2`}
                aria-label="Open shopping bag"
                onClick={() => setDrawerOpen(true)}>
                <MDBIcon fas icon="bag-shopping" />
                {cart && cart.items_count > 0 && (
                  <MDBBadge color="danger" className="ms-2 position-static">
                    {cart.items_count}
                  </MDBBadge>
                )}
              </MDBBtn>
            </div>
          </div>
        </MDBCollapse>
      </div>
    </MDBNavbar>
  );
}
