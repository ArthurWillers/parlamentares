// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    },
    rules: {
      // Classes semânticas com regras próprias em main.css seguem o prefixo existente por tela.
      // A regra continua validando normalmente as classes utilitárias do Tailwind.
      'better-tailwindcss/no-unknown-classes': ['error', {
        ignore: ['^(analysis-panel|bar-fill|bar-track|bar-value|brand|brand-detail|brand-divider|brand-mark|brand-name|breadcrumbs|category-caption|category-empty|category-fill|category-heading|category-label|category-list|category-section|category-track|category-value|chamber-field|chart-caption|chart-month|chart-scroll|clear-filters|compact-rank-name|compact-rank-track|compact-ranking-list|dashboard|demo-notice|desktop-break|directory-amount|directory-arrow|directory-avatar|directory-filters|directory-intro|directory-member-link|directory-page|directory-period-note|directory-rank|directory-results|directory-search|disclosure-icon|disclosure-panel|empty-state|filter-explainer|filter-field|filters|footer-brand|funds-mark|funds-note|header-status|integration-status|intro|intro-copy|intro-kicker|main-nav|mandate-warning|member-info|methodology-icon|methodology-note|methodology-section|methodology-title-block|month-label|monthly-chart|notice-mark|notice-tag|not-found-page|not-in-sample|principle-list|profile-avatar|profile-category-list|profile-content-grid|profile-demo-notice|profile-header|profile-identity|profile-image-note|profile-kicker|profile-month-bar|profile-monthly-chart|profile-monthly-panel|profile-page|profile-panel|profile-panel-heading|profile-period|profile-total|quarter-chart|rank-bar|rank-number|rank-value|ranking-card|ranking-card-heading|ranking-empty|ranking-heading|ranking-list|ranking-period|ranking-row|ranking-section|ranking-switch|rankings-board|scope-note|search-field|section-heading|section-total|segmented-control|site-footer|site-header|site-main|site-shell|source-card|source-cards|source-photo-links|source-status|sources-footer|sources-intro|sources-page|status-dot|summary|summary-item|supplier-footnote|supplier-money|supplier-peak|supplier-table|supplier-table-wrap|suppliers-panel|text-link|trend-section)$']
      }]
    }
  }
)
