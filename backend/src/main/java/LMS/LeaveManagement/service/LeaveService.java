package LMS.LeaveManagement.service;

import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.entity.User;
import LMS.LeaveManagement.repository.LeaveRequestRepository;
import LMS.LeaveManagement.repository.UserRepository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LeaveService {

    private final LeaveRequestRepository leaveRepository;
    private final UserRepository userRepository;

    public LeaveService(
            LeaveRequestRepository leaveRepository,
            UserRepository userRepository) {
        this.leaveRepository = leaveRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public LeaveRequest applyForLeave(
            LeaveRequest request, Authentication authentication) {

        if (request.getFromDate() == null || request.getToDate() == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Leave dates are required");
        }

        if (request.getFromDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Start date cannot be in the past");
        }

        if (request.getToDate().isBefore(request.getFromDate())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "End date cannot be before start date");
        }

        if (request.getLeaveType() == null || request.getLeaveType().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Leave type is required");
        }

        if (request.getReason() == null ||
            request.getReason().isBlank() ||
            request.getReason().length() > 500) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Reason is required and must be at most 500 characters");
        }

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "User not found"));

        request.setId(null);
        request.setUser(user);
        request.setStatus("PENDING");

        return leaveRepository.save(request);
    }

    public List<LeaveRequest> getMyLeaves(Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "User not found"));

        return leaveRepository.findByUserId(user.getId());
    }

    @Transactional
    public LeaveRequest updateLeave(Long id, LeaveRequest updatedRequest, Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "User not found"));

        LeaveRequest existing = leaveRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Leave request with ID " + id + " not found"));

        // Ownership rule: Employee can only update their own request
        if (!existing.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "You are not authorized to update another employee's leave request");
        }

        // Workflow rule: Only PENDING requests can be edited
        if (!"PENDING".equalsIgnoreCase(existing.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Cannot edit leave request with status '" + existing.getStatus() + "'. Only PENDING requests can be edited.");
        }

        // Validate updated fields
        if (updatedRequest.getFromDate() == null || updatedRequest.getToDate() == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Leave dates are required");
        }

        if (updatedRequest.getFromDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Start date cannot be in the past");
        }

        if (updatedRequest.getToDate().isBefore(updatedRequest.getFromDate())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "End date cannot be before start date");
        }

        if (updatedRequest.getLeaveType() == null || updatedRequest.getLeaveType().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Leave type is required");
        }

        if (updatedRequest.getReason() == null ||
            updatedRequest.getReason().isBlank() ||
            updatedRequest.getReason().length() > 500) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Reason is required and must be at most 500 characters");
        }

        existing.setLeaveType(updatedRequest.getLeaveType());
        existing.setFromDate(updatedRequest.getFromDate());
        existing.setToDate(updatedRequest.getToDate());
        existing.setReason(updatedRequest.getReason().trim());
        if (updatedRequest.getAssignedAdmin() != null) {
            existing.setAssignedAdmin(updatedRequest.getAssignedAdmin());
        }
        if (updatedRequest.getSharedWith() != null) {
            existing.setSharedWith(updatedRequest.getSharedWith());
        }

        return leaveRepository.save(existing);
    }

    public List<java.util.Map<String, Object>> getAvailableAdmins() {
        return userRepository.findByRoleIgnoreCase("ADMIN").stream()
            .map(u -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", u.getId());
                map.put("name", u.getName());
                map.put("email", u.getEmail());
                map.put("role", u.getRole());
                return map;
            })
            .collect(java.util.stream.Collectors.toList());
    }

    public List<java.util.Map<String, Object>> getAllUsers() {
        return userRepository.findAll().stream()
            .map(u -> {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", u.getId());
                map.put("name", u.getName());
                map.put("email", u.getEmail());
                map.put("role", u.getRole());
                return map;
            })
            .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void deleteLeave(Long id, Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "User not found"));

        LeaveRequest existing = leaveRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Leave request with ID " + id + " not found"));

        // Ownership rule: Employee can only cancel their own request
        if (!existing.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "You are not authorized to cancel another employee's leave request");
        }

        // Workflow rule: Only PENDING requests can be cancelled
        if (!"PENDING".equalsIgnoreCase(existing.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Cannot cancel leave request with status '" + existing.getStatus() + "'. Only PENDING requests can be cancelled.");
        }

        leaveRepository.delete(existing);
    }
}
