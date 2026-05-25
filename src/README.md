# Service Tree Panel

Hierarchical service tree visualisation for Grafana, with inline SLA / SLO indicators and roll-up from leaf to root.

Built by [Monzphere](https://monzphere.com) for teams that monitor business services in Zabbix, Prometheus, SQL or any other Grafana data source.

![Service Tree Panel](https://raw.githubusercontent.com/Monzphere/monzphere-servicetree-panel/main/src/img/screenshot-dashboard.png)

## Features

- **N-ary service tree** with expand / collapse drill-down
- **SLA roll-up** with three modes: *worst child*, *weighted average*, *min of leaves*
- **Three-tier SLA badge**: meeting (green), at-risk (amber), breached (red), with configurable warn threshold
- **Status roll-up**: parent inherits the worst status from any descendant
- **Data-source agnostic**: works with any query that returns `id`, `parentId`, `name`, `status`, `sla` columns
- **Zabbix-friendly**: status column accepts numeric severities (0–5) or labels (`ok`, `warning`, `disaster`, ...)
- **Tolerant tree builder**: handles orphans, cycles and duplicate IDs gracefully
- **Theme-aware**: uses the Grafana design system (`@grafana/ui`) for consistent look and feel in light and dark modes

## Data shape

The panel reads the first data frame of the query. Required columns (names are configurable in the panel options):

| Column      | Type     | Required | Description                                                                  |
|-------------|----------|----------|------------------------------------------------------------------------------|
| `id`        | string   | yes      | Unique identifier of the service                                             |
| `parentId`  | string   | no       | Parent service ID; empty / null → root                                       |
| `name`      | string   | no       | Display name (defaults to `id`)                                              |
| `status`    | string/n | no       | `ok`/`warning`/`critical`/`unknown` or numeric severity 0–5 (Zabbix-style)   |
| `sla`       | number   | no       | Current SLA value (0–100)                                                    |
| `slaTarget` | number   | no       | SLA target (falls back to panel option default, e.g. 99.9)                   |
| `weight`    | number   | no       | Weight for weighted roll-up mode (defaults to 1)                             |

## Using with the Zabbix data source

The panel works out of the box with the official Zabbix plugin for Grafana
([`alexanderzobnin-zabbix-app`](https://grafana.com/grafana/plugins/alexanderzobnin-zabbix-app/)).
You reuse the same data source you already configured for problems / metrics —
no extra connection.

1. Install the Zabbix plugin and configure the data source pointing to your Zabbix server.
2. Open the **Service Tree** panel options and set **Field preset → Zabbix**.
   The mapping becomes:

   | Panel field | Zabbix field  |
   |-------------|---------------|
   | `id`        | `serviceid`   |
   | `parentId`  | `parentid` / `parents` |
   | `name`      | `name`        |
   | `status`    | `status` (Zabbix numeric severity 0–5) |
   | `sla`       | `sli` / `sla` / `uptime` |
   | `slaTarget` | `goodsla`     |

3. Create a query in **Services** mode (the Zabbix plugin's query editor calls this
   *IT services / SLA*). The panel will read the resulting frame directly.
4. If your version of the Zabbix plugin returns columns under different names,
   set **Field preset → Custom** and type the exact column names (or pipe-separated
   aliases, e.g. `serviceid|id`).

The `auto` preset already accepts both Grafana-native names (`id`, `parentId`, ...)
and Zabbix names (`serviceid`, `parentid`, `sli`, `goodsla`, ...) at the same time,
so most setups need zero configuration.

### Other data sources

Any data source that returns the columns above works. Example with plain SQL:

```sql
SELECT
    s.serviceid          AS id,
    p.serviceid          AS "parentId",
    s.name               AS name,
    s.status             AS status,
    sla.current_sla      AS sla,
    sla.goodsla          AS "slaTarget",
    1                    AS weight
FROM services s
LEFT JOIN service_parent p ON p.child_serviceid = s.serviceid
LEFT JOIN service_sla sla   ON sla.serviceid = s.serviceid
```

## Roll-up modes

- **Worst child** *(default)* — parent SLA = `min(self, all descendants)`. Conservative; matches how on-call usually thinks about service health.
- **Weighted average** — parent SLA = Σ(child SLA × weight) / Σ weight. Uses *direct children only*. Good for composite services where some sub-services matter more.
- **Min of leaves** — parent SLA = smallest leaf SLA anywhere below the node. Same intent as *worst child* but ignores intermediate aggregate values.

Status is always rolled up as the worst severity (`critical > warning > ok > unknown`).

## Installation

```bash
grafana-cli plugins install monzphere-servicetree-panel
```

Or, for unpublished builds, drop the unsigned plugin folder into your Grafana plugins directory and start Grafana with:

```ini
[plugins]
allow_loading_unsigned_plugins = monzphere-servicetree-panel
```

## Development

```bash
npm install
npm run dev            # watch build
npm run server         # docker compose up grafana with the plugin mounted
npm test               # jest unit tests
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run e2e            # playwright (requires a running Grafana on :3000)
npm run build          # production bundle in ./dist
```

### Build a signable archive

```bash
npm run build
npx @grafana/sign-plugin@latest --rootUrls=https://your-grafana-instance
cp -R dist monzphere-servicetree-panel
zip -r monzphere-servicetree-panel.zip monzphere-servicetree-panel
```

## Compatibility

- Grafana **≥ 11.0**
- Node **≥ 20** for development

## License

[Apache 2.0](https://github.com/Monzphere/monzphere-servicetree-panel/blob/main/LICENSE)
