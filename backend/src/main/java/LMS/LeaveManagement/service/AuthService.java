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

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole("EMPLOYEE");

        userRepository.saveAndFlush(user);

        UserDetails details =
                org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password(user.getPassword())
                        .roles(user.getRole())
                        .build();

        String token = jwtService.generateToken(details);

        return new AuthResponse(
                token, "Bearer", user.getId(),
                user.getName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {

        String email = request.email().trim().toLowerCase();

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email, request.password()));
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid email or password"));

        // Auto-upgrade plain text passwords to BCrypt in database upon successful login
        if (user.getPassword() != null
                && !user.getPassword().startsWith("$2a$")
                && !user.getPassword().startsWith("$2b$")
                && !user.getPassword().startsWith("$2y$")) {
            user.setPassword(passwordEncoder.encode(request.password()));
            userRepository.save(user);
        }

        UserDetails details =
                org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password(user.getPassword())
                        .roles(user.getRole())
                        .build();

        String token = jwtService.generateToken(details);

        return new AuthResponse(
                token, "Bearer", user.getId(),
                user.getName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public Map<String, String> resetPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No account found with this email address. Please check and try again."));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        return Map.of("message", "Password reset successfully. Please login with your new password.");
    }

    @Transactional(readOnly = true)
public Map<String, Object> getCurrentUser(String email) {

    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not found"));

    return Map.of(
            "userId", user.getId(),
            "name", user.getName(),
            "email", user.getEmail(),
            "role", user.getRole()
    );
}
}
