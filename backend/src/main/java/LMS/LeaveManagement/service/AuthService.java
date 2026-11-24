package LMS.LeaveManagement.service;

import LMS.LeaveManagement.dto.AuthResponse;
import LMS.LeaveManagement.dto.ForgotPasswordRequest;
import LMS.LeaveManagement.dto.LoginRequest;
import LMS.LeaveManagement.dto.RegisterRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.UserRepository;
import LMS.LeaveManagement.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public static final String SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
    public static final String SUPER_ADMIN_NAME = "Super Admin";
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_EMPLOYEE = "EMPLOYEE";

    private static final java.util.Set<String> OFFICIAL_ADMIN_EMAILS = java.util.Set.of(
            "shri1@gmail.com",
            "shri@gmail.com",
            SUPER_ADMIN_EMAIL,
            "admin@settribe.com",
            "manideep@gmail.com",
            "sushil@gmail.com",
            "gaurav@gmail.com");

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered");
        }

        // All users registered through the registration form are ALWAYS EMPLOYEES
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(ROLE_EMPLOYEE);

        userRepository.saveAndFlush(user);

        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(ROLE_EMPLOYEE)
                .build();

        String token = jwtService.generateToken(details);

        return new AuthResponse(
                token, "Bearer", user.getId(),
                user.getName(), user.getEmail(), ROLE_EMPLOYEE);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        String password = request.password() != null ? request.password() : "";

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid email or password"));

        String effectiveRole = syncAndDetermineRole(user, email);

        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(effectiveRole)
                .build();

        String token = jwtService.generateToken(details);
        String displayName = resolveDisplayName(user);

        return new AuthResponse(
                token, "Bearer", user.getId(),
                displayName, user.getEmail(), effectiveRole);
    }

    private String syncAndDetermineRole(User user, String email) {
        if (isOfficialAdminEmail(email)) {
            boolean userUpdated = false;
            if (!ROLE_ADMIN.equalsIgnoreCase(user.getRole())) {
                user.setRole(ROLE_ADMIN);
                userUpdated = true;
            }
            if (SUPER_ADMIN_EMAIL.equalsIgnoreCase(email) && !SUPER_ADMIN_NAME.equalsIgnoreCase(user.getName())) {
                user.setName(SUPER_ADMIN_NAME);
                userUpdated = true;
            }
            if (userUpdated) {
                try {
                    userRepository.save(user);
                } catch (Exception ex) {
                    // Best effort profile update; non-fatal for login flow
                }
            }
            return ROLE_ADMIN;
        }
        return (user.getRole() != null && !user.getRole().isBlank())
                ? user.getRole().trim().toUpperCase()
                : ROLE_EMPLOYEE;
    }

    private String resolveDisplayName(User user) {
        if (SUPER_ADMIN_EMAIL.equalsIgnoreCase(user.getEmail())) {
            return SUPER_ADMIN_NAME;
        }
        return (user.getName() != null && !user.getName().isBlank()) ? user.getName() : "User";
    }

    private boolean isOfficialAdminEmail(String email) {
        if (email == null)
            return false;
        return OFFICIAL_ADMIN_EMAILS.contains(email.toLowerCase().trim());
    }

    @Transactional
    public Map<String, String> resetPassword(ForgotPasswordRequest request) {
        return performPasswordReset(request);
    }

    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        return performPasswordReset(request);
    }

    private Map<String, String> performPasswordReset(ForgotPasswordRequest request) {
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No account found with this email"));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        return Map.of("message", "Password has been successfully reset");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCurrentUser(String email) {
        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        User user = userRepository.findByEmail(cleanEmail)
                .or(() -> userRepository.findByEmail(email))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "User not found"));

        String role = (user.getRole() != null && !user.getRole().isBlank())
                ? user.getRole().trim().toUpperCase()
                : (isOfficialAdminEmail(user.getEmail()) ? ROLE_ADMIN : ROLE_EMPLOYEE);

        return Map.of(
                "userId", user.getId(),
                "name", resolveDisplayName(user),
                "email", user.getEmail(),
                "role", role);
    }
}
