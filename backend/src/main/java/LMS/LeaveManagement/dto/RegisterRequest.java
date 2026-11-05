package LMS.LeaveManagement.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    @Pattern(regexp = "^[A-Za-z\\s.'-]+$", message = "Name must contain only letters and spaces (no numbers allowed)")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email")
    @Size(max = 150)
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 72,
          message = "Password must be at least 6 characters")
    String password
) {}
