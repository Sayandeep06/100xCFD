import styles from './LoadingScreen.module.css';

export default function LoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>Loading...</p>
    </div>
  );
}