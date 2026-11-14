package LMS.LeaveManagement.config;

import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.LeaveRequestRepository;
import LMS.LeaveManagement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            LeaveRequestRepository leaveRequestRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        try {
            log.info("Checking initial application data...");

            // 1. Seed System Admin
            createOrUpdateAdmin("System Admin", "admin@settribe.com", "Password@123");

            // 2. Seed Admin User
            createOrUpdateAdmin("Admin User", "admin@gmail.com", "Password@123");

            // 3. Seed New Admin
            createOrUpdateAdmin("New Admin", "newadmin@gmail.com", "Shri1234@");

            // 4. Seed Employee
            User john = createOrGetEmployee("John Doe", "john@settribe.com", "Password@123");

            // 5. Seed Sample Leave Requests if table is empty
            if (leaveRequestRepository.count() == 0 && john != null) {
                log.info("Seeding initial sample leave requests for employee {}...", john.getEmail());

                LeaveRequest r1 = new LeaveRequest();
                r1.setUser(john);
                r1.setLeaveType("CASUAL");
                r1.setFromDate(LocalDate.now().plusDays(2));
                r1.setToDate(LocalDate.now().plusDays(4));
                r1.setReason("Attending family wedding ceremony");
                r1.setStatus("PENDING");
                r1.setAssignedAdmin("New Admin (newadmin@gmail.com)");
                leaveRequestRepository.save(r1);

                LeaveRequest r2 = new LeaveRequest();
                r2.setUser(john);
                r2.setLeaveType("SICK");
                r2.setFromDate(LocalDate.now().minusDays(10));
                r2.setToDate(LocalDate.now().minusDays(9));
                r2.setReason("Severe fever and doctor consultation");
                r2.setStatus("APPROVED");
                r2.setAssignedAdmin("System Admin (admin@settribe.com)");
                leaveRequestRepository.save(r2);

                LeaveRequest r3 = new LeaveRequest();
                r3.setUser(john);
                r3.setLeaveType("EARNED");
                r3.setFromDate(LocalDate.now().minusDays(30));
                r3.setToDate(LocalDate.now().minusDays(26));
                r3.setReason("Annual personal vacation");
                r3.setStatus("REJECTED");
                r3.setRejectionReason("High workload during sprint release");
                r3.setAssignedAdmin("Admin User (admin@gmail.com)");
                leaveRequestRepository.save(r3);

                log.info("Sample leave requests created successfully.");
            }

            log.info("Application data initialization completed successfully.");
        } catch (Exception ex) {
            log.warn("Data initialization encountered an exception: {}", ex.getMessage());
        }
    }

    private void createOrUpdateAdmin(String name, String email, String rawPassword) {
        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail).orElse(null);

        if (user == null) {
            user = new User();
            user.setName(name);
            user.setEmail(cleanEmail);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole("ADMIN");
            userRepository.save(user);
            log.info("Created Admin account: {}", cleanEmail);
        } else {
            // Ensure role is ADMIN
            if (!"ADMIN".equalsIgnoreCase(user.getRole())) {
                user.setRole("ADMIN");
                userRepository.save(user);
                log.info("Promoted account {} to ADMIN", cleanEmail);
            }
        }
    }

    private User createOrGetEmployee(String name, String email, String rawPassword) {
        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail).orElse(null);

        if (user == null) {
            user = new User();
            user.setName(name);
            user.setEmail(cleanEmail);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole("EMPLOYEE");
            user = userRepository.save(user);
            log.info("Created Employee account: {}", cleanEmail);
        }
        return user;
    }
}

