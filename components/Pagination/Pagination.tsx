import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage?: number;
  page?: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const activePage = currentPage || page || 1;

  const pages = [];
  let startPage = Math.max(1, activePage - 1);
  const endPage = Math.min(totalPages, startPage + 2);

  if (endPage - startPage < 2) {
    startPage = Math.max(1, endPage - 2);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={styles.container}>
      <button
        className={`${styles.pageBtn} ${styles.prevNextBtn}`}
        onClick={() => onPageChange(activePage - 1)}
        disabled={activePage === 1}
        aria-label="Previous page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>Prev</span>
      </button>

      {pages.map((p) => (
        <button
          key={p}
          className={`${styles.pageBtn} ${p === activePage ? styles.active : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      <button
        className={`${styles.pageBtn} ${styles.prevNextBtn}`}
        onClick={() => onPageChange(activePage + 1)}
        disabled={activePage === totalPages}
        aria-label="Next page"
      >
        <span>Next</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
