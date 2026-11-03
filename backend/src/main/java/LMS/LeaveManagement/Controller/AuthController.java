
package LMS.LeaveManagement.Controller;

import LMS.LeaveManagement.dto.AuthResponse;
import LMS.LeaveManagement.dto.ForgotPasswordRequest;
import LMS.LeaveManagement.dto.LoginRequest;
import LMS.LeaveManagement.dto.RegisterRequest;
import LMS.LeaveManagement.service.AuthService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String COOKIE_NAME = "ACCESS_TOKEN";
    private static final long COOKIE_MAX_AGE = 3600;

    private final AuthService authService;
    private final boolean cookieSecure;

    public AuthController(
            AuthService authService,
            @Value("${app.cookie.secure:false}") boolean cookieSecure) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
    }

    private ResponseCookie createAuthCookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(COOKIE_MAX_AGE)
                .sameSite("Strict")
                .build();
    }

    private ResponseCookie clearAuthCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }

    private Map<String, Object> userResponse(AuthResponse data) {
        return Map.of(
                "userId", data.userId(),
                "name", data.name(),
                "email", data.email(),
                "role", data.role()
        );
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse data = authService.register(request);

        // Do not expose the JWT in the response body.
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userResponse(data));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse data = authService.login(request);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        createAuthCookie(data.token()).toString()
                )
                .body(userResponse(data));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        clearAuthCookie().toString()
                )
                .body(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> currentUser(
            Authentication authentication) {

        return ResponseEntity.ok(
                authService.getCurrentUser(authentication.getName())
        );
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        return ResponseEntity.ok(
                authService.resetPassword(request)
        );
    }
}
