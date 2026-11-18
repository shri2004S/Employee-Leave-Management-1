package LMS.LeaveManagement;

import LMS.LeaveManagement.config.SecurityConfig;
import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.LeaveRequestRepository;
import LMS.LeaveManagement.repository.UserRepository;
import LMS.LeaveManagement.security.JwtAuthenticationFilter;
import LMS.LeaveManagement.service.AdminService;
import LMS.LeaveManagement.service.LeaveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminUserManagementTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LeaveRequestRepository leaveRepository;

    @Mock
    private JwtAuthenticationFilter jwtAuthFilter;

    private LeaveService leaveService;
    private AdminService adminService;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        leaveService = new LeaveService(leaveRepository, userRepository);
        adminService = new AdminService(leaveRepository);
        SecurityConfig securityConfig = new SecurityConfig(jwtAuthFilter);
        passwordEncoder = securityConfig.passwordEncoder();
    }

    @Test
    @DisplayName("Test 1: Verify Manideep Sir, Sushil Sir, and Gaurav Sir details and role")
    void testLiveAdminUserDetails() {
        User manideep = new User();
        manideep.setId(1L);
        manideep.setName("Manideep Sir");
        manideep.setEmail("manideep@gmail.com");
        manideep.setRole("ADMIN");

        User sushil = new User();
        sushil.setId(2L);
        sushil.setName("Sushil Sir");
        sushil.setEmail("sushil@gmail.com");
        sushil.setRole("ADMIN");

        User gaurav = new User();
        gaurav.setId(3L);
        gaurav.setName("Gaurav Sir");
        gaurav.setEmail("gaurav@gmail.com");
        gaurav.setRole("ADMIN");

        assertThat(manideep.getRole()).isEqualTo("ADMIN");
        assertThat(sushil.getRole()).isEqualTo("ADMIN");
        assertThat(gaurav.getRole()).isEqualTo("ADMIN");

        assertThat(manideep.getName()).isEqualTo("Manideep Sir");
        assertThat(sushil.getName()).isEqualTo("Sushil Sir");
        assertThat(gaurav.getName()).isEqualTo("Gaurav Sir");
    }

    @Test
    @DisplayName("Test 2: Verify PasswordEncoder dual matching for Shri1234@ and Password@123")
    void testPasswordEncoderDualMatching() {
        String encodedDefault = passwordEncoder.encode("Password@123");
        String encodedShri = passwordEncoder.encode("Shri1234@");

        // Direct matches
        assertThat(passwordEncoder.matches("Password@123", encodedDefault)).isTrue();
        assertThat(passwordEncoder.matches("Shri1234@", encodedShri)).isTrue();

        // Dual alias matches for seamless admin sign-in
        assertThat(passwordEncoder.matches("Shri1234@", encodedDefault)).isTrue();
        assertThat(passwordEncoder.matches("Password@123", encodedShri)).isTrue();

        // Plain text fallback compatibility
        assertThat(passwordEncoder.matches("Password@123", "Password@123")).isTrue();
        assertThat(passwordEncoder.matches("Shri1234@", "Shri1234@")).isTrue();

        // Wrong password rejection
        assertThat(passwordEncoder.matches("WrongPassword", encodedDefault)).isFalse();
    }

    @Test
    @DisplayName("Test 3: Verify getAvailableAdmins returns Manideep Sir, Sushil Sir, and Gaurav Sir")
    void testGetAvailableAdmins() {
        User u1 = new User();
        u1.setId(1L);
        u1.setName("Manideep Sir");
        u1.setEmail("manideep@gmail.com");
        u1.setRole("ADMIN");

        User u2 = new User();
        u2.setId(2L);
        u2.setName("Sushil Sir");
        u2.setEmail("sushil@gmail.com");
        u2.setRole("ADMIN");

        User u3 = new User();
        u3.setId(3L);
        u3.setName("Gaurav Sir");
        u3.setEmail("gaurav@gmail.com");
        u3.setRole("ADMIN");

        when(userRepository.findByRoleIgnoreCase("ADMIN")).thenReturn(List.of(u1, u2, u3));

        List<Map<String, Object>> admins = leaveService.getAvailableAdmins();

        assertThat(admins).hasSize(3);
        assertThat(admins.get(0).get("name")).isEqualTo("Manideep Sir");
        assertThat(admins.get(1).get("name")).isEqualTo("Sushil Sir");
        assertThat(admins.get(2).get("name")).isEqualTo("Gaurav Sir");
        verify(userRepository, times(1)).findByRoleIgnoreCase("ADMIN");
    }

    @Test
    @DisplayName("Test 4: Verify LeaveRequest assigned to Manideep Sir / Sushil Sir / Gaurav Sir")
    void testLeaveRequestAssignedAdmin() {
        User employee = new User();
        employee.setId(10L);
        employee.setName("John Doe");
        employee.setEmail("john@settribe.com");
        employee.setRole("EMPLOYEE");

        LeaveRequest request = new LeaveRequest();
        request.setUser(employee);
        request.setLeaveType("CASUAL");
        request.setFromDate(LocalDate.now().plusDays(1));
        request.setToDate(LocalDate.now().plusDays(3));
        request.setReason("Personal work");
        request.setStatus("PENDING");
        request.setAssignedAdmin("Manideep Sir (manideep@gmail.com)");

        assertThat(request.getAssignedAdmin()).isEqualTo("Manideep Sir (manideep@gmail.com)");
        assertThat(request.getStatus()).isEqualTo("PENDING");
        assertThat(request.getUser().getEmail()).isEqualTo("john@settribe.com");
    }

    @Test
    @DisplayName("Test 5: Verify Admin approval action on a pending leave request")
    void testAdminApprovalAction() {
        User employee = new User();
        employee.setId(10L);
        employee.setName("John Doe");
        employee.setEmail("john@settribe.com");

        LeaveRequest existing = new LeaveRequest();
        existing.setId(100L);
        existing.setUser(employee);
        existing.setLeaveType("SICK");
        existing.setFromDate(LocalDate.now());
        existing.setToDate(LocalDate.now().plusDays(2));
        existing.setReason("Viral fever");
        existing.setStatus("PENDING");
        existing.setAssignedAdmin("Sushil Sir (sushil@gmail.com)");

        when(leaveRepository.findById(100L)).thenReturn(Optional.of(existing));
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> updated = adminService.updateLeaveStatus(100L, "APPROVED");

        assertThat(updated.get("status")).isEqualTo("APPROVED");
        assertThat(existing.getStatus()).isEqualTo("APPROVED");
        assertThat(existing.getAssignedAdmin()).isEqualTo("Sushil Sir (sushil@gmail.com)");
        verify(leaveRepository, times(1)).findById(100L);
        verify(leaveRepository, times(1)).save(existing);
    }
}
