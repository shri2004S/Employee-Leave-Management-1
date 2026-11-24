package LMS.LeaveManagement;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Disabled("Requires live external Neon PostgreSQL connection; unit tests covered in AdminUserManagementTest")
public class NeonConnectionTest {

    @BeforeAll
    public static void initEnv() {
        LeaveManagementApplication.loadDotEnv();
    }

    @Autowired
    private DataSource dataSource;

    @Test
    public void testNeonPostgresConnection() throws Exception {
        assertNotNull(dataSource, "DataSource bean should be configured and injected");

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT 1")) {

            assertTrue(rs.next(), "Query 'SELECT 1' should return a result row");
            int result = rs.getInt(1);
            assertEquals(1, result);

            DatabaseMetaData meta = conn.getMetaData();
            System.out.println("=================================================");
            System.out.println("=== NEON POSTGRES HEALTH CHECK PASSED ===");
            System.out.println("Database Product: " + meta.getDatabaseProductName());
            System.out.println("Database Version: " + meta.getDatabaseProductVersion());
            System.out.println("Driver Name:      " + meta.getDriverName());
            System.out.println("Driver Version:   " + meta.getDriverVersion());
            System.out.println("=================================================");
        }
    }
}
