package LMS.LeaveManagement.Controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import LMS.LeaveManagement.entity.LeaveRequest;
import LMS.LeaveManagement.service.LeaveService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/admins")
    public ResponseEntity<List<Map<String, Object>>> getAvailableAdmins() {
        return ResponseEntity.ok(leaveService.getAvailableAdmins());
    }

    @GetMapping("/recipients")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(leaveService.getAllUsers());
    }

    @PostMapping({"", "/applyLeaves"})
    public ResponseEntity<?> applyForLeave(
            @RequestBody LeaveRequest request,
            Authentication authentication) {

        LeaveRequest saved =
            leaveService.applyForLeave(request, authentication);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Leave request submitted successfully");
        response.put("id", saved.getId());
        response.put("leaveType", saved.getLeaveType());
        response.put("fromDate", saved.getFromDate());
        response.put("toDate", saved.getToDate());
        response.put("reason", saved.getReason());
        response.put("status", saved.getStatus());
        response.put("assignedAdmin", saved.getAssignedAdmin() != null ? saved.getAssignedAdmin() : "");
        response.put("sharedWith", saved.getSharedWith() != null ? saved.getSharedWith() : "");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping({"", "/getLeaves"})
    public ResponseEntity<?> getMyLeaves(Authentication authentication) {

        List<LeaveRequest> leaves =
            leaveService.getMyLeaves(authentication);

        List<Map<String, Object>> result = leaves.stream()
            .map(leave -> {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", leave.getId());
                map.put("leaveType", leave.getLeaveType());
                map.put("fromDate", leave.getFromDate());
                map.put("toDate", leave.getToDate());
                map.put("reason", leave.getReason());
                map.put("status", leave.getStatus());
                map.put("rejectionReason", leave.getRejectionReason());
                map.put("assignedAdmin", leave.getAssignedAdmin() != null ? leave.getAssignedAdmin() : "All Admins");
                map.put("sharedWith", leave.getSharedWith() != null ? leave.getSharedWith() : "");
                return map;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateLeave(
            @PathVariable Long id,
            @RequestBody LeaveRequest request,
            Authentication authentication) {

        LeaveRequest updated =
            leaveService.updateLeave(id, request, authentication);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Leave request updated successfully");
        response.put("id", updated.getId());
        response.put("leaveType", updated.getLeaveType());
        response.put("fromDate", updated.getFromDate());
        response.put("toDate", updated.getToDate());
        response.put("reason", updated.getReason());
        response.put("status", updated.getStatus());
        response.put("assignedAdmin", updated.getAssignedAdmin() != null ? updated.getAssignedAdmin() : "");
        response.put("sharedWith", updated.getSharedWith() != null ? updated.getSharedWith() : "");

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLeave(
            @PathVariable Long id,
            Authentication authentication) {

        leaveService.deleteLeave(id, authentication);

        return ResponseEntity.ok(
            Map.of(
                "message", "Leave request cancelled successfully",
                "id", id
            )
        );
    }
}
