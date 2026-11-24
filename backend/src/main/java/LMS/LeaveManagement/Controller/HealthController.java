package LMS.LeaveManagement.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @GetMapping("/api/health/db")
    public ResponseEntity<Map<String, Object>> dbHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        long startTime = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {

            long latency = System.currentTimeMillis() - startTime;
            DatabaseMetaData meta = conn.getMetaData();

            response.put("status", "UP");
            response.put("database", meta.getDatabaseProductName());
            response.put("databaseVersion", meta.getDatabaseProductVersion());
            response.put("latencyMs", latency);
            response.put("connectionValid", rs.next());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            response.put("status", "DOWN");
            response.put("error", "Database connection check failed: " + e.getClass().getSimpleName());
            response.put("latencyMs", latency);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }
}
