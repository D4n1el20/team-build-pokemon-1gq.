"use client";

import styles from './dado.module.css';

export default function Dado({ valor }) {
    const faceWidth = 78.58;
    const backgroundPositionX = - (valor - 1) * faceWidth;

    return (
        <div className={styles.dado} style={{backgroundPosition: `${backgroundPositionX}px 0px`,}}/>
    );
}