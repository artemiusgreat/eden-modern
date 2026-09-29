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
import type { StoreCategory } from '@/lib/woo';

export default function SiteNavbar({ categories }: { categories: StoreCategory[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { cart, setDrawerOpen } = useCart();

  const navCats = categories.filter((c) => c.parent === 0).slice(0, 5);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <MDBNavbar expand="xl" className={styles.navbar} sticky>
      <div className={styles.navbarInner}>
        <Link href="/" passHref legacyBehavior className="mr-5">
          <MDBNavbarBrand className={styles.brand}>
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
            <MDBNavbarNav className={`${styles.links} mx-auto w-auto`}>
              {navCats.map((c) => (
                <MDBNavbarItem key={c.id}>
                  <Link href={`/category/${c.slug}`} passHref legacyBehavior>
                    <MDBNavbarLink className={styles.navLink} onClick={() => setOpen(false)}>
                      {c.name}
                    </MDBNavbarLink>
                  </Link>
                </MDBNavbarItem>
              ))}
              <MDBNavbarItem>
                <Link href="/blog" passHref legacyBehavior>
                  <MDBNavbarLink className={styles.navLink} onClick={() => setOpen(false)}>
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
              <Link href="/search?on_sale=1" className={`btn-outline-noir ${styles.cta}`}>
                Shop Sale
              </Link>
              <Link href="/account" passHref legacyBehavior>
                <MDBBtn tag="a" className={styles.iconBtn} aria-label="My account">
                  <MDBIcon far icon="user" />
                </MDBBtn>
              </Link>
              <MDBBtn
                className={`${styles.iconBtn} px-2`}
                aria-label="Open shopping bag"
                onClick={() => setDrawerOpen(true)}>
                <MDBIcon fas icon="bag-shopping" />
                {cart && cart.items_count > 0 && (
                  <MDBBadge notification className="ms-2 position-static">
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
