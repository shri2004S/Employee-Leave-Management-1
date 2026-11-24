package LMS.LeaveManagement.config;

import LMS.LeaveManagement.LeaveManagementApplication;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${DATABASE_URL:#{null}}")
    private String databaseUrl;

    @Value("${spring.datasource.url:jdbc:postgresql://ep-divine-truth-bizs83uu.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require}")
    private String springDatasourceUrl;

    @Value("${spring.datasource.username:neondb_owner}")
    private String defaultUsername;

    @Value("${spring.datasource.password:npg_vTadwN5YgSr6}")
    private String defaultPassword;

    @Bean(destroyMethod = "close")
    @Primary
    public DataSource dataSource() {
        LeaveManagementApplication.loadDotEnv();

        HikariConfig config = new HikariConfig();

        // Check System properties, environment, and Spring properties
        String envDbUrl = System.getProperty("DATABASE_URL");
        if (envDbUrl == null || envDbUrl.isBlank()) {
            envDbUrl = System.getenv("DATABASE_URL");
        }
        if (envDbUrl == null || envDbUrl.isBlank()) {
            envDbUrl = databaseUrl;
        }

        String rawUrl = (envDbUrl != null && !envDbUrl.isBlank()) ? envDbUrl : springDatasourceUrl;
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = "jdbc:postgresql://ep-divine-truth-bizs83uu.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
        }

        String jdbcUrl;
        String username = defaultUsername;
        String password = defaultPassword;

        // Convert standard URI format (postgresql://USER:PASSWORD@HOST/DB?sslmode=require) to JDBC format
        if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
            try {
                URI uri = new URI(rawUrl.replace("postgres://", "postgresql://"));
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                if (path != null && path.startsWith("/")) {
                    path = path.substring(1);
                }

                String query = uri.getQuery();
                String originalHost = host;
                String resolvedHost = resolveHostIfNecessary(originalHost);
                boolean usedIpFallback = !resolvedHost.equals(originalHost);

                StringBuilder jdbcUrlBuilder = new StringBuilder("jdbc:postgresql://")
                        .append(resolvedHost)
                        .append(":")
                        .append(port)
                        .append("/")
                        .append(path);

                // Enforce TLS / sslmode=require for Neon
                if (query == null || query.isBlank()) {
                    jdbcUrlBuilder.append("?sslmode=require");
                } else {
                    if (!query.contains("sslmode=")) {
                        jdbcUrlBuilder.append("?").append(query).append("&sslmode=require");
                    } else {
                        jdbcUrlBuilder.append("?").append(query);
                    }
                }

                // If fallback IP was used for Neon, route tenant via endpoint option
                if (usedIpFallback && originalHost != null && originalHost.contains(".neon.tech")
                        && !jdbcUrlBuilder.toString().contains("options=")) {
                    String endpointId = originalHost.split("\\.")[0];
                    jdbcUrlBuilder.append("&options=endpoint%3D").append(endpointId);
                }

                // If connecting to PgBouncer pooler, avoid server-side prepared statement collision
                if (originalHost != null && originalHost.contains("-pooler") && !jdbcUrlBuilder.toString().contains("prepareThreshold=")) {
                    jdbcUrlBuilder.append("&prepareThreshold=0");
                }

                jdbcUrl = jdbcUrlBuilder.toString();

                if (uri.getUserInfo() != null) {
                    String[] userInfo = uri.getUserInfo().split(":", 2);
                    username = URLDecoder.decode(userInfo[0], StandardCharsets.UTF_8);
                    if (userInfo.length > 1) {
                        password = URLDecoder.decode(userInfo[1], StandardCharsets.UTF_8);
                    }
                }
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to parse Neon DATABASE_URL: " + e.getMessage(), e);
            }
        } else {
            jdbcUrl = resolveJdbcUrl(rawUrl);
            if (username == null || username.isBlank()) {
                username = System.getProperty("SPRING_DATASOURCE_USERNAME", System.getenv("SPRING_DATASOURCE_USERNAME"));
            }
            if (password == null || password.isBlank()) {
                password = System.getProperty("SPRING_DATASOURCE_PASSWORD", System.getenv("SPRING_DATASOURCE_PASSWORD"));
            }
            if (username == null || username.isBlank()) {
                username = "neondb_owner";
            }
            if (password == null || password.isBlank()) {
                password = "npg_vTadwN5YgSr6";
            }
        }

        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName("org.postgresql.Driver");
        config.setUsername(username);
        config.setPassword(password);

        // Bounded pool settings for Neon cloud database
        config.setPoolName("NeonHikariPool");
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(20000);   // 20s
        config.setIdleTimeout(300000);         // 5m
        config.setMaxLifetime(1800000);        // 30m
        config.setKeepaliveTime(30000);        // 30s keep-alive ping
        config.setValidationTimeout(5000);     // 5s
        config.setConnectionTestQuery("SELECT 1");

        // Log masked URL for security
        log.info("Initialized Neon HikariCP DataSource: {}", maskUrl(jdbcUrl));

        return new HikariDataSource(config);
    }

    private String resolveJdbcUrl(String rawJdbcUrl) {
        if (rawJdbcUrl == null || !rawJdbcUrl.startsWith("jdbc:postgresql://")) {
            return rawJdbcUrl;
        }
        try {
            String stripped = rawJdbcUrl.substring("jdbc:postgresql://".length());
            int slashIdx = stripped.indexOf('/');
            if (slashIdx <= 0) return rawJdbcUrl;
            String hostPort = stripped.substring(0, slashIdx);
            String pathAndQuery = stripped.substring(slashIdx);

            String host = hostPort;
            String port = "5432";
            if (hostPort.contains(":")) {
                String[] parts = hostPort.split(":", 2);
                host = parts[0];
                port = parts[1];
            }

            String resolvedHost = resolveHostIfNecessary(host);
            boolean usedIpFallback = !resolvedHost.equals(host);

            StringBuilder newUrl = new StringBuilder("jdbc:postgresql://")
                    .append(resolvedHost)
                    .append(":")
                    .append(port)
                    .append(pathAndQuery);

            if (usedIpFallback && host.contains(".neon.tech") && !newUrl.toString().contains("options=")) {
                String endpointId = host.split("\\.")[0];
                String sep = newUrl.toString().contains("?") ? "&" : "?";
                newUrl.append(sep).append("options=endpoint%3D").append(endpointId);
            }

            return newUrl.toString();
        } catch (Exception e) {
            log.warn("Could not parse JDBC url for fallback resolution: {}", e.getMessage());
            return rawJdbcUrl;
        }
    }

    private String resolveHostIfNecessary(String host) {
        if (host == null || host.isBlank() || isIpAddress(host)) {
            return host;
        }
        try {
            java.net.InetAddress.getByName(host);
            return host;
        } catch (java.net.UnknownHostException e) {
            log.warn("System DNS failed to resolve host '{}' (often blocked or refused by local router DNS). Attempting fallback DNS (8.8.8.8)...", host);
            try {
                java.util.Hashtable<String, String> env = new java.util.Hashtable<>();
                env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
                env.put("java.naming.provider.url", "dns://8.8.8.8 dns://1.1.1.1");
                javax.naming.directory.DirContext ctx = new javax.naming.directory.InitialDirContext(env);
                javax.naming.directory.Attributes attrs = ctx.getAttributes(host, new String[]{"A"});
                if (attrs != null && attrs.get("A") != null) {
                    String resolvedIp = attrs.get("A").get().toString();
                    log.info("Successfully resolved '{}' -> {} via public fallback DNS.", host, resolvedIp);
                    return resolvedIp;
                }
            } catch (Exception ex) {
                log.warn("Public DNS fallback lookup failed for '{}': {}", host, ex.getMessage());
            }
            return host;
        }
    }

    private static boolean isIpAddress(String str) {
        return str != null && str.matches("^\\d{1,3}(\\.\\d{1,3}){3}$");
    }

    private static String maskUrl(String url) {
        if (url == null) return "null";
        return url.replaceAll("://[^:@]+:[^@]+@", "://***:***@");
    }
}
