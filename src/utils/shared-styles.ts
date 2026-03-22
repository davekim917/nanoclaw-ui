/**
 * Shared CSS fragments for Lit components.
 *
 * Shadow DOM prevents global CSS from reaching components.
 * Import these and spread into your component's `static styles` array:
 *
 *   static override styles = [skeletonStyles, emptyStateStyles, css`...`];
 */

import { css } from 'lit';

/** Skeleton shimmer animation for loading states. */
export const skeletonStyles = css`
  .skeleton {
    background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-quaternary) 50%, var(--color-bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.8s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

/** Standard empty state layout: icon + title + hint + CTA button. */
export const emptyStateStyles = css`
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl) var(--spacing-xl);
    text-align: center;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--color-accent-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-md);
  }

  .empty-icon svg {
    width: 24px;
    height: 24px;
    stroke: var(--color-accent);
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .empty-hint {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    max-width: 320px;
    line-height: 1.6;
    margin-bottom: var(--spacing-md);
  }

  .empty-action {
    padding: 8px 20px;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-full);
    background: none;
    color: var(--color-accent);
    font-family: var(--font-sans);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .empty-action:hover {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }
`;
