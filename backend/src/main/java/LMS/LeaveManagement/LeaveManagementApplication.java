package LMS.LeaveManagement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
public class LeaveManagementApplication {

    private static final Logger log = LoggerFactory.getLogger(LeaveManagementApplication.class);

    static {
        loadDotEnv();
    }

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(LeaveManagementApplication.class, args);
    }

    public static void loadDotEnv() {
        File[] candidates = new File[] {
            new File(".env"),
            new File("../.env"),
            new File("backend/.env")
        };
        for (File file : candidates) {
            if (file.exists() && file.isFile()) {
                try {
                    List<String> lines = Files.readAllLines(file.toPath());
                    int loadedCount = 0;
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String value = line.substring(eqIdx + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                                loadedCount++;
                            }
                        }
                    }
                    if (loadedCount > 0) {
                        log.info("Loaded {} environment keys from {}", loadedCount, file.getAbsolutePath());
                    }
                    break;
                } catch (Exception ex) {
                    log.warn("Could not read {}: {}", file.getPath(), ex.getMessage());
                }
            }
        }
    }
}
