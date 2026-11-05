package LMS.LeaveManagement.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    String email,

    @NotBlank(message = "New password is required")
    @Size(min = 6, max = 72, message = "Password must be at least 6 characters")
    String newPassword
) {}

