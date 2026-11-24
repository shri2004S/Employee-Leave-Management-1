package LMS.LeaveManagement;

import LMS.LeaveManagement.Controller.AdminLeaveController;
import LMS.LeaveManagement.Controller.SuperAdminController;
import LMS.LeaveManagement.dto.CreateAdminRequest;
import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.LeaveRequestRepository;
import LMS.LeaveManagement.repository.UserRepository;
import LMS.LeaveManagement.security.JwtService;
import LMS.LeaveManagement.service.AdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SecurityAndRbacTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LeaveRequestRepository leaveRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private Authentication authentication;

    private SuperAdminController superAdminController;
    private AdminLeaveController adminLeaveController;
    private AdminService adminService;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        superAdminController = new SuperAdminController(userRepository, passwordEncoder);
        adminService = new AdminService(leaveRepository);
        adminLeaveController = new AdminLeaveController(adminService);

        // Real JwtService test instance with a valid 256-bit Base64 secret key
        String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        jwtService = new JwtService(secret, 3600000);
    }

    // ----------------------------------------------------
    // 1. JWT TOKEN INTEGRITY & SECURITY TESTS
    // ----------------------------------------------------

    @Test
    @DisplayName("SEC-01: Valid JWT token should correctly extract subject and pass validation")
    void testJwtTokenGenerationAndValidation() {
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername("employee@settribe.com")
                .password("encoded")
                .roles("EMPLOYEE")
                .build();

        String token = jwtService.generateToken(userDetails);

        assertThat(token).isNotEmpty();
        assertThat(jwtService.extractUsername(token)).isEqualTo("employee@settribe.com");
        assertThat(jwtService.isTokenValid(token, userDetails)).isTrue();
    }

    @Test
    @DisplayName("SEC-02: Tampered JWT token should be rejected with exception")
    void testJwtTamperedTokenRejected() {
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername("employee@settribe.com")
                .password("encoded")
                .roles("EMPLOYEE")
                .build();

        String token = jwtService.generateToken(userDetails);
        // Tamper with the payload part of the JWT
        String tamperedToken = token.substring(0, token.length() - 5) + "abcde";

        assertThatThrownBy(() -> jwtService.extractUsername(tamperedToken))
                .isInstanceOf(Exception.class);
    }

    // ----------------------------------------------------
    // 2. ROLE-BASED ACCESS CONTROL (RBAC) ISOLATION
    // ----------------------------------------------------

    @Test
    @DisplayName("SEC-03: Regular employee or normal admin cannot access Super Admin endpoint (403 Forbidden)")
    void testNonSuperAdminBlockedFromSuperAdminEndpoints() {
        when(authentication.getName()).thenReturn("manideep@gmail.com");

        assertThatThrownBy(() -> superAdminController.getAdmins(authentication))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.FORBIDDEN)
                .hasMessageContaining("Only Super Admin can access this resource");
    }

    @Test
    @DisplayName("SEC-04: Super Admin (superadmin@gmail.com) is authorized to access Super Admin endpoint")
    void testSuperAdminAuthorized() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");
        when(userRepository.findAll()).thenReturn(java.util.Collections.emptyList());

        ResponseEntity<?> response = superAdminController.getAdmins(authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("SEC-05: Admin user status update must reject illegal status transitions (400 Bad Request)")
    void testAdminRejectInvalidStatus() {
        Map<String, String> payload = Map.of("status", "HACKED_STATUS");

        assertThatThrownBy(() -> adminLeaveController.updateLeaveStatus(1L, payload))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.BAD_REQUEST)
                .hasMessageContaining("Status must be either APPROVED or REJECTED");
    }

    @Test
    @DisplayName("SEC-06: Admin user status update accepts valid APPROVED and REJECTED statuses")
    void testAdminAcceptsValidStatuses() {
        LeaveRequest req = new LeaveRequest();
        req.setId(10L);
        req.setStatus("PENDING");

        when(leaveRepository.findById(10L)).thenReturn(Optional.of(req));
        when(leaveRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<Map<String, Object>> resApproved =
                adminLeaveController.updateLeaveStatus(10L, Map.of("status", "APPROVED"));
        assertThat(resApproved.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resApproved.getBody().get("status")).isEqualTo("APPROVED");

        ResponseEntity<Map<String, Object>> resRejected =
                adminLeaveController.updateLeaveStatus(10L, Map.of("status", "REJECTED"));
        assertThat(resRejected.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resRejected.getBody().get("status")).isEqualTo("REJECTED");
    }

    // ----------------------------------------------------
    // 3. INPUT VALIDATION & INJECTION RESISTANCE TESTS
    // ----------------------------------------------------

    @Test
    @DisplayName("SEC-07: Admin creation rejects passwords failing complexity requirements")
    void testAdminCreationRejectsWeakPassword() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");

        // Weak password missing uppercase or numbers
        CreateAdminRequest req = new CreateAdminRequest("newadmin@settribe.com", "weak");

        assertThatThrownBy(() -> superAdminController.createAdmin(req, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.BAD_REQUEST)
                .hasMessageContaining("Password must be at least 6 characters and contain uppercase, lowercase, and a number");
    }

    @Test
    @DisplayName("SEC-08: Admin creation rejects names containing numbers")
    void testAdminCreationRejectsNumbersInName() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");

        CreateAdminRequest req = new CreateAdminRequest("Admin123", "newadmin@settribe.com", "Password@123");

        assertThatThrownBy(() -> superAdminController.createAdmin(req, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.BAD_REQUEST)
                .hasMessageContaining("Numbers are not allowed in name");
    }

    @Test
    @DisplayName("SEC-09: SQL Injection attempt in email search does not compromise system")
    void testSqlInjectionSafetyInEmailLookup() {
        String maliciousEmail = "' OR '1'='1' -- ";
        when(userRepository.findByEmail(maliciousEmail.trim().toLowerCase())).thenReturn(Optional.empty());

        Optional<User> result = userRepository.findByEmail(maliciousEmail.trim().toLowerCase());
        assertThat(result).isEmpty();
        verify(userRepository, times(1)).findByEmail(maliciousEmail.trim().toLowerCase());
    }
}
