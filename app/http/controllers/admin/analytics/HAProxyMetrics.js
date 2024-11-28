const axios = require('axios');

class HAProxyMetricsCollector {
    constructor(config) {
        this.config = config;
    }

    async getHAProxyStats() {
        try {
            const response = await axios.get(`${this.config.haproxyStatsUrl}/stats;csv`);
            return this.parseHAProxyStats(response.data);
        } catch (error) {
            throw new Error(`Failed to fetch HAProxy stats: ${error.message}`);
        }
    }

    parseHAProxyStats(statsData) {
        const metrics = {
            frontends: {},
            backends: {},
            servers: {}
        };

        const lines = statsData.split('\n');
        lines.forEach(line => {
            const fields = line.split(',');
            if (fields.length > 1) {
                const [pxname, svname, status, weight, actConn, bckConn] = fields;
                
                if (svname === 'FRONTEND') {
                    metrics.frontends[pxname] = {
                        status,
                        connections: actConn,
                        bytesIn: fields[8],
                        bytesOut: fields[9]
                    };
                } else if (svname === 'BACKEND') {
                    metrics.backends[pxname] = {
                        status,
                        queueCurrent: fields[2],
                        queueMax: fields[3],
                        sessionsCurrent: fields[4]
                    };
                } else {
                    if (!metrics.servers[pxname]) {
                        metrics.servers[pxname] = {};
                    }
                    metrics.servers[pxname][svname] = {
                        status,
                        weight,
                        activeConnections: actConn,
                        backupConnections: bckConn
                    };
                }
            }
        });

        return metrics;
    }
}

module.exports = HAProxyMetricsCollector;