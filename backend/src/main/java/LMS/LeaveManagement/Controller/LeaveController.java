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

    @PostMapping({"", "/applyLeaves"})
    public ResponseEntity<?> applyForLeave(
            @RequestBody LeaveRequest request,
            Authentication authentication) {

        LeaveRequest saved =
            leaveService.applyForLeave(request, authentication);

        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message", "Leave request submitted successfully",
                "id", saved.getId(),
                "leaveType", saved.getLeaveType(),
                "fromDate", saved.getFromDate(),
                "toDate", saved.getToDate(),
                "reason", saved.getReason(),
                "status", saved.getStatus()
            )
        );
    }
    
    @GetMapping({"", "/getLeaves"})
    public ResponseEntity<?> getMyLeaves(Authentication authentication) {

        List<LeaveRequest> leaves =
            leaveService.getMyLeaves(authentication);

        List<Map<String, Object>> result = leaves.stream()
            .map(leave -> Map.<String, Object>of(
                "id", leave.getId(),
                "leaveType", leave.getLeaveType(),
                "fromDate", leave.getFromDate(),
                "toDate", leave.getToDate(),
                "reason", leave.getReason(),
                "status", leave.getStatus()
            ))
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

        return ResponseEntity.ok(
            Map.of(
                "message", "Leave request updated successfully",
                "id", updated.getId(),
                "leaveType", updated.getLeaveType(),
                "fromDate", updated.getFromDate(),
                "toDate", updated.getToDate(),
                "reason", updated.getReason(),
                "status", updated.getStatus()
            )
        );
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
