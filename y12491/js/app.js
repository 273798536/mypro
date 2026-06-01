import { Network3D } from './network.js';
import { Timeline, DetailPanel, SummaryPanel, FilterBar, ExportPanel } from './ui.js';
import { issuers, guarantees, contagionPaths, ratingChanges, filterDataByDate, computeRiskLevels, RISK_LEVELS, SECTORS } from './data.js';

class App {
  constructor() {
    this.network3d = null;
    this.timeline = null;
    this.detailPanel = null;
    this.summaryPanel = null;
    this.filterBar = null;
    this.exportPanel = null;
    this.currentDate = '2021-06-01';
    this.currentFilters = null;
    this.riskMap = {};
  }

  init() {
    this.network3d = new Network3D(
      document.getElementById('network-container'),
      (issuerId) => this.onNodeSelected(issuerId)
    );
    this.network3d.init();

    this.timeline = new Timeline(
      document.getElementById('timeline-container'),
      (dateStr) => this.onTimelineChanged(dateStr)
    );
    this.timeline.render();

    this.detailPanel = new DetailPanel(
      document.getElementById('detail-container'),
      (issuerId) => this.onNodeSelected(issuerId)
    );
    this.detailPanel.render();

    this.summaryPanel = new SummaryPanel(document.getElementById('summary-container'));
    this.summaryPanel.render();

    this.filterBar = new FilterBar(
      document.getElementById('filter-container'),
      (filters) => this.onFilterChanged(filters)
    );
    this.filterBar.render();

    this.exportPanel = new ExportPanel(
      document.getElementById('export-container'),
      this.network3d
    );
    this.exportPanel.render();

    this.refreshNetwork();
  }

  refreshNetwork() {
    const { issuers: filteredIssuers, guarantees: filteredGuarantees, contagionPaths: filteredPaths } = filterDataByDate(this.currentDate);

    let visibleIssuers = filteredIssuers;
    let visibleGuarantees = filteredGuarantees;
    let visiblePaths = filteredPaths;

    if (this.currentFilters) {
      if (this.currentFilters.sectors.size > 0) {
        visibleIssuers = visibleIssuers.filter(i => this.currentFilters.sectors.has(i.sector));
        const visibleIds = new Set(visibleIssuers.map(i => i.id));
        visibleGuarantees = visibleGuarantees.filter(g => visibleIds.has(g.guarantorId) && visibleIds.has(g.guaranteedId));
        visiblePaths = visiblePaths.filter(p => p.path.every(id => visibleIds.has(id)));
      }

      if (!this.currentFilters.showDuplicates) {
        const seen = new Set();
        visibleGuarantees = visibleGuarantees.filter(g => {
          if (g.isDuplicate && g.duplicateGroupId) {
            if (seen.has(g.duplicateGroupId)) return false;
            seen.add(g.duplicateGroupId);
          }
          return true;
        });
      }
    }

    this.riskMap = computeRiskLevels(visibleIssuers, visiblePaths);

    if (this.currentFilters && this.currentFilters.riskFilter !== 'all') {
      const targetLevel = this.currentFilters.riskFilter;
      visibleIssuers = visibleIssuers.filter(i => {
        const level = this.riskMap[i.id];
        if (targetLevel === 'high') return level === RISK_LEVELS.HIGH || i.defaultStatus;
        if (targetLevel === 'medium') return level === RISK_LEVELS.MEDIUM || level === RISK_LEVELS.HIGH || i.defaultStatus;
        return true;
      });
      const visibleIds = new Set(visibleIssuers.map(i => i.id));
      visibleGuarantees = visibleGuarantees.filter(g => visibleIds.has(g.guarantorId) && visibleIds.has(g.guaranteedId));
      visiblePaths = visiblePaths.filter(p => p.path.every(id => visibleIds.has(id)));
    }

    this.network3d.buildNetwork(visibleIssuers, visibleGuarantees, visiblePaths, this.riskMap);

    this.summaryPanel.update(this.currentDate);
  }

  onNodeSelected(issuerId) {
    const riskLevel = this.riskMap[issuerId] || RISK_LEVELS.LOW;
    this.detailPanel.showIssuer(issuerId, riskLevel);
    this.network3d.selectNode(issuerId);
  }

  onTimelineChanged(dateStr) {
    this.currentDate = dateStr;
    this.refreshNetwork();
    if (this.detailPanel._currentIssuer) {
      const riskLevel = this.riskMap[this.detailPanel._currentIssuer.id] || RISK_LEVELS.LOW;
      this.detailPanel.showIssuer(this.detailPanel._currentIssuer.id, riskLevel);
    }
  }

  onFilterChanged(filters) {
    this.currentFilters = filters;
    this.refreshNetwork();
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
});
