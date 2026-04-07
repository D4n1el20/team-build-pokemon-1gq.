"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '../lib/authService';
import styles from './page.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await authService.getCurrentUser();
      setUser(user);
    };
    getUser();

    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    router.refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {user ? (
          <div className={styles.userInfo}>
            <span>Olá, {user.email}!</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sair
            </button>
          </div>
        ) : (
          <Link href="/auth">
            <button className={styles.loginButton}>
              Entrar
            </button>
          </Link>
        )}
      </div>

      <h1 className={styles.title}>Times de Pokémon</h1>
      <p className={styles.description}>
        Bem-vindo ao construtor de times de Pokémon! Monte equipes equilibradas para batalhas épicas.
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
