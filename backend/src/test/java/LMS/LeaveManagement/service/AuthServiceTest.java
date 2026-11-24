package LMS.LeaveManagement.service;

import LMS.LeaveManagement.dto.AuthResponse;
import LMS.LeaveManagement.dto.ForgotPasswordRequest;
import LMS.LeaveManagement.dto.LoginRequest;
import LMS.LeaveManagement.dto.RegisterRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.UserRepository;
import LMS.LeaveManagement.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtService);
    }

    @Test
    @DisplayName("TC-AUTH-01: Should register a new user with EMPLOYEE role and encoded password")
    void testRegisterSuccess() {
        RegisterRequest req = new RegisterRequest("Alice Johnson", "alice@example.com", "Password@123");

        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("encodedPassword");
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-token-123");

        AuthResponse response = authService.register(req);

        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo("alice@example.com");
        assertThat(response.name()).isEqualTo("Alice Johnson");
        assertThat(response.role()).isEqualTo("EMPLOYEE");
        assertThat(response.token()).isEqualTo("jwt-token-123");
        verify(userRepository, times(1)).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("TC-AUTH-03: Should reject registration when email already exists (409 Conflict)")
    void testRegisterDuplicateEmailConflict() {
        RegisterRequest req = new RegisterRequest("Alice Johnson", "alice@example.com", "Password@123");

        when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.CONFLICT)
                .hasMessageContaining("Email is already registered");

        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("TC-AUTH-04: Should authenticate valid employee login and return JWT token")
    void testLoginSuccessRegularEmployee() {
        LoginRequest req = new LoginRequest("bob@example.com", "Password@123");

        User user = new User();
        user.setId(20L);
        user.setName("Bob Smith");
        user.setEmail("bob@example.com");
        user.setPassword("encodedPassword");
        user.setRole("EMPLOYEE");

        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-bob-token");

        AuthResponse response = authService.login(req);

        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo("bob@example.com");
        assertThat(response.name()).isEqualTo("Bob Smith");
        assertThat(response.role()).isEqualTo("EMPLOYEE");
        assertThat(response.token()).isEqualTo("jwt-bob-token");
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("TC-AUTH-04B: Official admin email logging in should be guaranteed ADMIN role")
    void testLoginOfficialAdminEnforced() {
        LoginRequest req = new LoginRequest("manideep@gmail.com", "Password@123");

        User user = new User();
        user.setId(2L);
        user.setName("Manideep Sir");
        user.setEmail("manideep@gmail.com");
        user.setPassword("encodedPassword");
        user.setRole("EMPLOYEE"); // Even if stored as EMPLOYEE, official email enforces ADMIN

        when(userRepository.findByEmail("manideep@gmail.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-admin-token");

        AuthResponse response = authService.login(req);

        assertThat(response.role()).isEqualTo("ADMIN");
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("TC-AUTH-04C: Super Admin logging in must be guaranteed display name 'Super Admin' and role 'ADMIN'")
    void testLoginSuperAdminDisplayNameEnforced() {
        LoginRequest req = new LoginRequest("superadmin@gmail.com", "Password@123");

        User user = new User();
        user.setId(1L);
        user.setName("Shri (Admin)"); // Old legacy name in database
        user.setEmail("superadmin@gmail.com");
        user.setPassword("encodedPassword");
        user.setRole("ADMIN");

        when(userRepository.findByEmail("superadmin@gmail.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-super-token");

        AuthResponse response = authService.login(req);

        assertThat(response.name()).isEqualTo("Super Admin");
        assertThat(response.role()).isEqualTo("ADMIN");
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("TC-AUTH-05: Should reject login with invalid password (401 Unauthorized)")
    void testLoginInvalidCredentials() {
        LoginRequest req = new LoginRequest("bob@example.com", "WrongPassword");

        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.UNAUTHORIZED)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    @DisplayName("TC-AUTH-05B: Should reject login when user does not exist (401 Unauthorized)")
    void testLoginUserNotFound() {
        LoginRequest req = new LoginRequest("nonexistent@example.com", "Password@123");

        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("TC-AUTH-06: Should reset password securely with BCrypt encoding")
    void testForgotPasswordSuccess() {
        ForgotPasswordRequest req = new ForgotPasswordRequest("alice@example.com", "NewPassword@123");

        User user = new User();
        user.setId(15L);
        user.setEmail("alice@example.com");
        user.setPassword("oldHash");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPassword@123")).thenReturn("newHashedPassword");

        Map<String, String> result = authService.forgotPassword(req);

        assertThat(result.get("message")).isEqualTo("Password has been successfully reset");
        assertThat(user.getPassword()).isEqualTo("newHashedPassword");
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("TC-AUTH-07: Should reject password reset for non-existent email (404 Not Found)")
    void testForgotPasswordNotFound() {
        ForgotPasswordRequest req = new ForgotPasswordRequest("unknown@example.com", "NewPassword@123");

        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.forgotPassword(req))
                .isInstanceOf(ResponseStatusException.class)
                .matches(e -> ((ResponseStatusException) e).getStatusCode() == HttpStatus.NOT_FOUND)
                .hasMessageContaining("No account found with this email");
    }

    @Test
    @DisplayName("TC-AUTH-08: Should return sanitized current user details for /api/auth/me")
    void testGetCurrentUserSuccess() {
        User user = new User();
        user.setId(30L);
        user.setName("Sarah Connor");
        user.setEmail("sarah@settribe.com");
        user.setRole("EMPLOYEE");

        when(userRepository.findByEmail("sarah@settribe.com")).thenReturn(Optional.of(user));

        Map<String, Object> details = authService.getCurrentUser("sarah@settribe.com");

        assertThat(details.get("userId")).isEqualTo(30L);
        assertThat(details.get("name")).isEqualTo("Sarah Connor");
        assertThat(details.get("email")).isEqualTo("sarah@settribe.com");
        assertThat(details.get("role")).isEqualTo("EMPLOYEE");
    }

    @Test
    @DisplayName("TC-AUTH-08B: Should enforce name 'Super Admin' for superadmin@gmail.com in /api/auth/me")
    void testGetCurrentUserSuperAdminEnforced() {
        User user = new User();
        user.setId(1L);
        user.setName("Shri (Admin)");
        user.setEmail("superadmin@gmail.com");
        user.setRole("ADMIN");

        when(userRepository.findByEmail("superadmin@gmail.com")).thenReturn(Optional.of(user));

        Map<String, Object> details = authService.getCurrentUser("superadmin@gmail.com");

        assertThat(details.get("name")).isEqualTo("Super Admin");
        assertThat(details.get("role")).isEqualTo("ADMIN");
    }
}
