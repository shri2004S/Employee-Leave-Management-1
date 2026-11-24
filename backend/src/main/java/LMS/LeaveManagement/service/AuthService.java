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

    private static final java.util.Set<String> OFFICIAL_ADMIN_EMAILS = java.util.Set.of(
            "shri1@gmail.com",
            "shri@gmail.com",
            "superadmin@gmail.com",
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
        user.setRole("EMPLOYEE");

        userRepository.saveAndFlush(user);

        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles("EMPLOYEE")
                .build();

        String token = jwtService.generateToken(details);

        return new AuthResponse(
                token, "Bearer", user.getId(),
                user.getName(), user.getEmail(), "EMPLOYEE");
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

        // Enforce ADMIN role for official admin emails or preserve DB role
        String effectiveRole;
        if (isOfficialAdminEmail(email)) {
            effectiveRole = "ADMIN";
            boolean userUpdated = false;
            if (!"ADMIN".equalsIgnoreCase(user.getRole())) {
                user.setRole("ADMIN");
                userUpdated = true;
            }
            if ("superadmin@gmail.com".equalsIgnoreCase(email) && !"Super Admin".equalsIgnoreCase(user.getName())) {
                user.setName("Super Admin");
                userUpdated = true;
            }
            if (userUpdated) {
                try {
                    userRepository.save(user);
                } catch (Exception ignored) {
                }
            }
        } else {
            effectiveRole = (user.getRole() != null && !user.getRole().isBlank())
                    ? user.getRole().trim().toUpperCase()
                    : "EMPLOYEE";
        }

        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(effectiveRole)
                .build();

        String token = jwtService.generateToken(details);

        String displayName = "superadmin@gmail.com".equalsIgnoreCase(user.getEmail())
                ? "Super Admin"
                : (user.getName() != null ? user.getName() : "User");

        return new AuthResponse(
                token, "Bearer", user.getId(),
                displayName, user.getEmail(), effectiveRole);
    }

    private boolean isOfficialAdminEmail(String email) {
        if (email == null)
            return false;
        return OFFICIAL_ADMIN_EMAILS.contains(email.toLowerCase().trim());
    }

    @Transactional
    public Map<String, String> resetPassword(ForgotPasswordRequest request) {
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No account found with this email"));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        return Map.of("message", "Password has been successfully reset");
    }

    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        return resetPassword(request);
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
                : (isOfficialAdminEmail(user.getEmail()) ? "ADMIN" : "EMPLOYEE");

        String displayName = "superadmin@gmail.com".equalsIgnoreCase(user.getEmail())
                ? "Super Admin"
                : (user.getName() != null ? user.getName() : "User");

        return Map.of(
                "userId", user.getId(),
                "name", displayName,
                "email", user.getEmail(),
                "role", role);
    }
}
