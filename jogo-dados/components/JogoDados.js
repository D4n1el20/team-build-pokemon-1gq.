"use client";

import { useState } from 'react';
import Dado from "./dado";
import styles from './jogoDados.module.css';

const rolar = () => Math.floor(Math.random() * 6) + 1;

export default function JogoDados() {
    const [a1, setA1] = useState(1);
    const [a2, setA2] = useState(1);
    const [b1, setB1] = useState(1);
    const [b2, setB2] = useState(1);
    const [scoreA, setScoreA] = useState(2);
    const [scoreB, setScoreB] = useState(2);
    const [activePlayer, setActivePlayer] = useState('A');
    const [round, setRound] = useState(1);
    const [vencedorA, setvencedorA] = useState(0);
    const [vencedorB, setvencedorB] = useState(0);
    const [roundResult, setRoundResult] = useState('');
    const [gameOver, setGameOver] = useState(false);

    const resetGame = () => {
        setA1(1);
        setA2(1);
        setB1(1);
        setB2(1);
        setScoreA(2);
        setScoreB(2);
        setActivePlayer('A');
        setRound(1);
        setvencedorA(0);
        setvencedorB(0);
        setRoundResult('');
        setGameOver(false);
    };

    const play = (player) => {
        if (gameOver) return;

        const d1 = rolar();
        const d2 = rolar();
        const sum = d1 + d2;

        if (player === 'A') {
            setA1(d1);
            setA2(d2);
            setScoreA(sum);
            setActivePlayer('B');
            setRoundResult(`Jogador A rolou ${d1} + ${d2} = ${sum}. Agora jogador B joga.`);
            return;
        }

        setB1(d1);
        setB2(d2);
        setScoreB(sum);

        let resultado = `Jogador B rolou ${d1} + ${d2} = ${sum}. `;
        if (scoreA > sum) {
            setvencedorA((prev) => prev + 1);
            resultado += 'Jogador A vence a rodada.';
        } else if (scoreA < sum) {
            setvencedorB((prev) => prev + 1);
            resultado += 'Jogador B vence a rodada.';
        } else {
            resultado += 'Empate na rodada.';
        }

        if (round >= 5) {
            setGameOver(true);
            const vencedorFinal = vencedorA > vencedorB ? 'Jogador A' : vencedorA < vencedorB ? 'Jogador B' : 'Empate';
            resultado += ` Jogo encerrado. Resultado final: ${vencedorFinal} (A ${vencedorA} x ${vencedorB} B).`;
            setRoundResult(resultado);
            setActivePlayer(null);
            return;
        }

        setRound((prev) => prev + 1);
        setActivePlayer('A');
        setRoundResult(resultado + ` Iniciando rodada ${round + 1}.`);
    };

    return (
        <div className={styles.gameWrapper}>
            <h2>Rodada: {Math.min(round, 5)} / 5</h2>
            <p className={styles.turnLabel}>Placar: A {vencedorA} x {vencedorB} B</p>
            <p className={styles.turnLabel}>{roundResult || 'Aguardando rodada.'}</p>

            <div className={styles.playersRow}>
                <div className={styles.playerCard}>
                    <h3>Jogador A</h3>
                    <Dado valor={a1} />
                    <Dado valor={a2} />
                    <p>Pontuação: {scoreA}</p>
                </div>
                <div className={styles.playerCard}>
                    <h3>Jogador B</h3>
                    <Dado valor={b1} />
                    <Dado valor={b2} />
                    <p>Pontuação: {scoreB}</p>
                </div>
            </div>

            <div className={styles.controles}>
                <button className={styles.toggleButton} onClick={() => play('A')} disabled={gameOver || activePlayer !== 'A'}>
                    Jogar (Jogador A)
                </button>
                <button className={styles.toggleButton} onClick={() => play('B')} disabled={gameOver || activePlayer !== 'B'}>
                    Jogar (Jogador B)
                </button>
            </div>

            {gameOver && (
                <div>
                    {vencedorA === vencedorB && <p className={styles.turnLabel}>Empate geral!</p>}
                    <button className={styles.toggleButton} onClick={resetGame}>Reiniciar Jogo</button>
                </div>
            )}

            <p className={styles.turnLabel}>
                {gameOver ? 'Jogo encerrado' : `Turno: Jogador ${activePlayer}`}
            </p>
        </div>
    )
};