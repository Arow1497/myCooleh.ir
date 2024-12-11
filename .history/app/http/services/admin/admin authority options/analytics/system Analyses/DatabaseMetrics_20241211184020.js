const { PrismaClient } = require('@prisma/client');

class DatabaseMetricsCollector {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async getMariaDBReplicationStatus() {
        try {
            const replicationStatus = await this.prisma.$queryRaw`
                SHOW SLAVE STATUS
            `;

            return {
                slaveIORunning: replicationStatus.Slave_IO_Running === 'Yes',
                slaveSQLRunning: replicationStatus.Slave_SQL_Running === 'Yes',
                secondsBehindMaster: replicationStatus.Seconds_Behind_Master,
                lastIOError: replicationStatus.Last_IO_Error,
                lastSQLError: replicationStatus.Last_SQL_Error
            };
        } catch (error) {
            throw new Error(`Failed to get MariaDB replication status: ${error.message}`);
        }
    }

    async getMariaDBPerformanceMetrics() {
        try {
            const [globalStatus, globalVariables] = await Promise.all([
                this.prisma.$queryRaw`SHOW GLOBAL STATUS`,
                this.prisma.$queryRaw`SHOW GLOBAL VARIABLES`
            ]);

            return {
                connections: {
                    max: globalVariables.find(v => v.Variable_name === 'max_connections'),
                    current: globalStatus.find(s => s.Variable_name === 'Threads_connected'),
                    running: globalStatus.find(s => s.Variable_name === 'Threads_running')
                },
                bufferPool: {
                    size: globalStatus.find(s => s.Variable_name === 'Innodb_buffer_pool_size'),
                    readRequests: globalStatus.find(s => s.Variable_name === 'Innodb_buffer_pool_read_requests'),
                    writeRequests: globalStatus.find(s => s.Variable_name === 'Innodb_buffer_pool_write_requests')
                },
                queryCache: {
                    hits: globalStatus.find(s => s.Variable_name === 'Qcache_hits'),
                    inserts: globalStatus.find(s => s.Variable_name === 'Qcache_inserts'),
                    notCached: globalStatus.find(s => s.Variable_name === 'Qcache_not_cached')
                }
            };
        } catch (error) {
            throw new Error(`Failed to get MariaDB performance metrics: ${error.message}`);
        }
    }
}

module.exports = DatabaseMetricsCollector;