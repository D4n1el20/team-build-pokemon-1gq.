"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '../lib/authService';
import styles from './page.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const syncUserState = async () => {
      const {
        data: { user }
      } = await authService.getCurrentUser();

      setUser(user ?? null);
      setAuthLoading(false);
    };

    syncUserState();

    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      setMenuOpen(false);
      syncUserState();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleProfileClick = () => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    setMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setMenuOpen(false);
    router.refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.profileWrapper}>
          <button
            className={styles.profileButton}
            onClick={handleProfileClick}
            aria-haspopup={user ? 'menu' : undefined}
            aria-expanded={user ? menuOpen : undefined}
          >
            {authLoading ? 'Carregando...' : user?.email || 'Login'}
          </button>

          {user && menuOpen && (
            <div className={styles.profileMenu} role="menu">
              <button onClick={handleLogout} className={styles.menuButton} role="menuitem">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <h1 className={styles.title}>Times de Pokemon</h1>
      <p className={styles.description}>
        Bem-vindo ao construtor de times de Pokemon. Monte equipes equilibradas para batalhas epicas.
      </p>
      <div className={styles.buttonContainer}>
        <Link href="/builder">
          <button className={`${styles.button} ${styles.newTeamButton}`}>
            Montar um Novo Time
          </button>
        </Link>
        <Link href="/teams">
          <button className={`${styles.button} ${styles.savedTeamsButton}`}>
            Meus Times Salvos
          </button>
        </Link>
      </div>
    </div>
  );
}
