package LMS.LeaveManagement;

import LMS.LeaveManagement.Controller.SuperAdminController;
import LMS.LeaveManagement.dto.CreateAdminRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SuperAdminControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private Authentication authentication;

    private SuperAdminController controller;

    @BeforeEach
    void setUp() {
        controller = new SuperAdminController(userRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Should reject non-superadmin user trying to access SuperAdminController")
    void testNonSuperAdminForbidden() {
        when(authentication.getName()).thenReturn("shri1@gmail.com");

        assertThatThrownBy(() -> controller.getAdmins(authentication))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Should allow Super Admin to create a new Administrator account")
    void testCreateAdminSuccess() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");
        when(userRepository.findByEmail("newadmin@settribe.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password@123")).thenReturn("encodedPassword");

        User savedUser = new User();
        savedUser.setId(20L);
        savedUser.setName("New Admin");
        savedUser.setEmail("newadmin@settribe.com");
        savedUser.setRole("ADMIN");

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        CreateAdminRequest req = new CreateAdminRequest("New Admin", "newadmin@settribe.com", "Password@123");
        ResponseEntity<Map<String, Object>> response = controller.createAdmin(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("role")).isEqualTo("ADMIN");
        assertThat(response.getBody().get("email")).isEqualTo("newadmin@settribe.com");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should allow Super Admin to create a new Administrator using ONLY email and password")
    void testCreateAdminWithOnlyEmailAndPassword() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");
        when(userRepository.findByEmail("rahul.sharma@settribe.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password@123")).thenReturn("encodedPassword");

        User savedUser = new User();
        savedUser.setId(25L);
        savedUser.setName("Rahul Sharma (Admin)");
        savedUser.setEmail("rahul.sharma@settribe.com");
        savedUser.setRole("ADMIN");

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        CreateAdminRequest req = new CreateAdminRequest("rahul.sharma@settribe.com", "Password@123");
        ResponseEntity<Map<String, Object>> response = controller.createAdmin(req, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("role")).isEqualTo("ADMIN");
        assertThat(response.getBody().get("email")).isEqualTo("rahul.sharma@settribe.com");
        assertThat(response.getBody().get("name")).isEqualTo("Rahul Sharma (Admin)");
    }

    @Test
    @DisplayName("Should reject admin creation if name contains digits")
    void testCreateAdminDigitsInName() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");

        CreateAdminRequest req = new CreateAdminRequest("Admin123", "admin123@settribe.com", "Password@123");
        assertThatThrownBy(() -> controller.createAdmin(req, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Should reject admin creation if email already exists")
    void testCreateAdminDuplicateEmail() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");
        when(userRepository.findByEmail("existing@settribe.com")).thenReturn(Optional.of(new User()));

        CreateAdminRequest req = new CreateAdminRequest("Existing Admin", "existing@settribe.com", "Password@123");
        assertThatThrownBy(() -> controller.createAdmin(req, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.CONFLICT);
    }

    @Test
    @DisplayName("Should return list of all admin users for Super Admin")
    void testGetAdminsList() {
        when(authentication.getName()).thenReturn("superadmin@gmail.com");

        User u1 = new User();
        u1.setId(1L);
        u1.setName("Super Admin");
        u1.setEmail("superadmin@gmail.com");
        u1.setRole("ADMIN");

        User u2 = new User();
        u2.setId(2L);
        u2.setName("Employee User");
        u2.setEmail("emp@settribe.com");
        u2.setRole("EMPLOYEE");

        when(userRepository.findAll()).thenReturn(List.of(u1, u2));

        ResponseEntity<List<Map<String, Object>>> res = controller.getAdmins(authentication);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody()).hasSize(1);
        assertThat(res.getBody().get(0).get("email")).isEqualTo("superadmin@gmail.com");
    }
}
