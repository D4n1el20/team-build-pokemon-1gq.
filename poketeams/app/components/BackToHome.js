"use client";

import Link from 'next/link';
import styles from './BackToHome.module.css';

export default function BackToHome() {
  return (
    <div className={styles.wrapper}>
      <Link href="/" className={styles.link}>
        Voltar para inicio
      </Link>
    </div>
  );
}
