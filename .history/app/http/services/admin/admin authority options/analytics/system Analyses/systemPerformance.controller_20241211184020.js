const createError = require("http-errors");
const { StatusCodes: HttpStatus } = require("http-status-codes");
const Controller = require("../controller");
const { PrismaClient } = require('@prisma/client');
const si = require('systeminformation');
const promClient = require('prom-client');
const RedisInfo = require('redis-info');
const Docker = require('docker-stats');
const Bull = require('bull');
const amqp = require('amqplib');
const NginxMetricsCollector = require('./NginxMetrics');
const HAProxyMetricsCollector = require('./HAProxyMetrics');
const DatabaseMetricsCollector = require('./DatabaseMetrics');

const prisma = new PrismaClient();

class SystemPerformanceController extends Controller {
    constructor() {
        super();
        this.nginxCollector = new NginxMetricsCollector({
            nginxStatusUrl: process.env.NGINX_STATUS_URL,
            nginxHost: process.env.NGINX_HOST,
            nginxUser: process.env.NGINX_USER,
            nginxPrivateKey: process.env.NGINX_PRIVATE_KEY
        });
        this.haproxyCollector = new HAProxyMetricsCollector({
            haproxyStatsUrl: process.env.HAPROXY_STATS_URL
        });
        this.dbCollector = new DatabaseMetricsCollector();
        this.prisma = new PrismaClient();

    }
 

    // System Metrics
    async getSystemMetrics(req, res, next) {
        try {
            const [cpu, mem, disk, network] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.fsSize(),
                si.networkStats()
            ]);

            return res.status(HttpStatus.OK).json({
                cpu: {
                    usage: cpu.currentLoad,
                    cores: cpu.cores,
                    temperature: cpu.temperature
                },
                memory: {
                    total: mem.total,
                    used: mem.used,
                    free: mem.free,
                    swapUsed: mem.swapused
                },
                disk: disk.map(d => ({
                    fs: d.fs,
                    size: d.size,
                    used: d.used,
                    available: d.available
                })),
                network: network.map(n => ({
                    interface: n.iface,
                    rxBytes: n.rx_bytes,
                    txBytes: n.tx_bytes
                }))
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getDatabaseMetrics(req, res, next) {
        try {
            // MariaDB Metrics via PrismaORM
            const dbMetrics = await prisma.$queryRaw`
                SHOW GLOBAL STATUS WHERE Variable_name IN 
                ('Queries', 'Slow_queries', 'Threads_connected', 'Created_tmp_disk_tables')
            `;

            // Redis Metrics
            const redisInfo = new RedisInfo(process.env.REDIS_URL);
            const redisMetrics = await redisInfo.info();

            // MongoDB Metrics
            const mongoMetrics = await prisma.$runCommandRaw({
                serverStatus: 1,
                metrics: 1
            });

            return res.status(HttpStatus.OK).json({
                mariadb: dbMetrics,
                redis: {
                    connectedClients: redisMetrics.connected_clients,
                    usedMemory: redisMetrics.used_memory,
                    hitRate: redisMetrics.keyspace_hits / (redisMetrics.keyspace_hits + redisMetrics.keyspace_misses)
                },
                mongodb: {
                    connections: mongoMetrics.connections,
                    opcounters: mongoMetrics.opcounters
                }
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getMessageQueueMetrics(req, res, next) {
        try {
            // Bull Queue Metrics
            const notificationQueue = new Bull('notifications');
            const bullMetrics = await notificationQueue.getJobCounts();

            // RabbitMQ Metrics
            const conn = await amqp.connect(process.env.RABBITMQ_URL);
            const channel = await conn.createChannel();
            const rabbitMetrics = await channel.checkQueue('notifications');

            await channel.close();
            await conn.close();

            return res.status(HttpStatus.OK).json({
                bull: {
                    waiting: bullMetrics.waiting,
                    active: bullMetrics.active,
                    completed: bullMetrics.completed,
                    failed: bullMetrics.failed
                },
                rabbitmq: {
                    messages: rabbitMetrics.messageCount,
                    consumers: rabbitMetrics.consumerCount
                }
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getContainerMetrics(req, res, next) {
        try {
            const docker = new Docker();
            const containers = await docker.getStats();

            const containerMetrics = containers.map(container => ({
                id: container.id,
                name: container.name,
                cpu: container.cpu_stats,
                memory: container.memory_stats,
                network: container.networks
            }));

            return res.status(HttpStatus.OK).json({
                containers: containerMetrics,
                totalContainers: containers.length
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getClusterHealth(req, res, next) {
        try {
            // Galera Cluster Status
            const galeraStatus = await prisma.$queryRaw`
                SHOW STATUS WHERE Variable_name LIKE 'wsrep%'
            `;

            // ProxySQL Metrics
            const proxySqlStatus = await prisma.$queryRaw`
                SELECT * FROM stats.stats_mysql_connection_pool
            `;

            return res.status(HttpStatus.OK).json({
                galera: {
                    clusterSize: galeraStatus.find(s => s.Variable_name === 'wsrep_cluster_size'),
                    clusterStatus: galeraStatus.find(s => s.Variable_name === 'wsrep_cluster_status'),
                    localState: galeraStatus.find(s => s.Variable_name === 'wsrep_local_state_comment')
                },
                proxysql: proxySqlStatus
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getWebSocketMetrics(req, res, next) {
        try {
            // Assuming you have a WebSocket server instance
            const wsMetrics = {
                connections: global.wsServer?.connections?.length || 0,
                messagesSent: global.wsStats?.messagesSent || 0,
                messagesReceived: global.wsStats?.messagesReceived || 0,
                errorCount: global.wsStats?.errors || 0
            };

            return res.status(HttpStatus.OK).json(wsMetrics);
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getNginxMetrics(req, res, next) {
        try {
            const [status, logs] = await Promise.all([
                this.nginxCollector.getNginxStatus(),
                this.nginxCollector.getNginxLogs()
            ]);

            return res.status(HttpStatus.OK).json({
                status,
                logs,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getLoadBalancerMetrics(req, res, next) {
        try {
            const haproxyStats = await this.haproxyCollector.getHAProxyStats();

            return res.status(HttpStatus.OK).json({
                haproxy: haproxyStats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

    async getDatabaseReplicationMetrics(req, res, next) {
        try {
            const [replicationStatus, performanceMetrics] = await Promise.all([
                this.dbCollector.getMariaDBReplicationStatus(),
                this.dbCollector.getMariaDBPerformanceMetrics()
            ]);

            return res.status(HttpStatus.OK).json({
                replication: replicationStatus,
                performance: performanceMetrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(createError(HttpStatus.INTERNAL_SERVER_ERROR, error.message));
        }
    }

}

module.exports = {
    SystemPerformanceController: new SystemPerformanceController()
}

/*

I've created a comprehensive SystemPerformanceController that includes several key monitoring endpoints:

getSystemMetrics: Monitors CPU, memory, disk, and network usage
getDatabaseMetrics: Tracks metrics for MariaDB, Redis, and MongoDB
getMessageQueueMetrics: Monitors Bull and RabbitMQ queue statistics
getContainerMetrics: Collects Docker container metrics
getClusterHealth: Monitors Galera Cluster and ProxySQL status
getWebSocketMetrics: Tracks WebSocket connection statistics
The controller follows your existing code structure and includes all necessary dependencies for monitoring your tech stack. Each handler provides detailed metrics and follows proper error handling patterns.

To use this controller, you'll need to:

Set up appropriate environment variables (REDIS_URL, RABBITMQ_URL, etc.)
Add the routes to your Express application
Ensure proper permissions for accessing system metrics
The metrics provided will help you monitor:

System resource usage
Database performance and connection pools
Message queue backlogs and processing rates
Container health and resource consumption
Cluster synchronization status
WebSocket connection status

Breaking down the functionality into separate utility files:

nginxMetrics.js: Handles Nginx metrics collection
haproxyMetrics.js: Manages HAProxy statistics
databaseMetrics.js: Handles detailed database monitoring
Added new endpoints to the controller:

getNginxMetrics: Monitors Nginx status and logs
getLoadBalancerMetrics: Tracks HAProxy statistics
getDatabaseReplicationMetrics: Monitors MariaDB replication and performance
Enhanced database monitoring with:

Master/Slave replication status
Buffer pool metrics
Query cache performance
Connection statistics
Added comprehensive HAProxy monitoring:

Frontend metrics
Backend metrics
Individual server statistics
Queue monitoring
Implemented detailed Nginx monitoring:

Active connections
Request statistics
Log analysis
Performance metrics
The code follows best practices with:

Separation of concerns
Modular design
Error handling
Configuration through environment variables
Clean and maintainable code structure
*/