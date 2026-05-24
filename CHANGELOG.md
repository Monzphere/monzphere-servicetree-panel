# Changelog

All notable changes to this plugin are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-24

### Added

- First release.
- Hierarchical N-ary service tree with expand / collapse drill-down.
- Three SLA roll-up modes: worst child, weighted average, min of leaves.
- Three-tier SLA badge (meeting / at-risk / breached) with configurable warn threshold.
- Tolerant tree builder: handles orphans, cycles and duplicate IDs.
- Status normalisation for Zabbix-style numeric severities (0–5) and common string labels.
- Field mapping accepts pipe-separated aliases (e.g. `id|serviceid|service_id`).
- Field presets: **auto** (id + serviceid simultaneously), **zabbix** (Zabbix-native names),
  **custom** (user-defined column names).
- Native support for the `alexanderzobnin-zabbix-datasource` Services query mode.
- Jest unit tests for utilities and components (57 tests).
- Playwright smoke E2E test against a running Grafana instance.
- Docker compose stack with Grafana 11.5, CSV demo data and the Zabbix plugin installed.
